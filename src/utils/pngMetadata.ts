/**
 * PNG 元信息提取工具
 *
 * 支持从 AI 生成工具（ComfyUI、Stable Diffusion WebUI）导出的 PNG 图片中
 * 提取正面提示词（positive prompt）文本。
 *
 * PNG 的 tEXt chunk 结构：keyword\0text
 * - ComfyUI: keyword="prompt", text 为工作流 JSON
 * - SD WebUI: keyword="parameters", text 为参数文本
 */

// ============ 基础文件读取 ============

/**
 * 使用 FileReader 将 File 对象读取为 Uint8Array
 */
function readFileAsBytes(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
      } else {
        reject(new Error('无法读取文件内容'));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

// ============ PNG Chunk 解析 ============

/** PNG chunk */
interface PNGChunk {
  type: string;
  data: Uint8Array;
}

/** PNG 文件签名 */
const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

/**
 * 解析 PNG 文件的 chunk 结构
 * @param data PNG 文件的完整二进制数据
 * @returns chunk 数组（type + data），不包含 IHDR 和图像数据 chunk 的内容数据
 */
function parsePNGChunks(data: Uint8Array): PNGChunk[] {
  // 验证 PNG 签名
  if (data.length < 8) return [];
  for (let i = 0; i < 8; i++) {
    if (data[i] !== PNG_SIGNATURE[i]) return [];
  }

  const chunks: PNGChunk[] = [];
  let pos = 8;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  while (pos < data.length - 8) {
    const length = view.getUint32(pos, false); // big-endian
    const type = String.fromCharCode(
      data[pos + 4],
      data[pos + 5],
      data[pos + 6],
      data[pos + 7]
    );
    const chunkData = data.slice(pos + 8, pos + 8 + length);

    chunks.push({ type, data: chunkData });

    if (type === 'IEND') break;

    pos += 12 + length; // 4 length + 4 type + N data + 4 CRC
  }

  return chunks;
}

// ============ ComfyUI 格式提取 ============

/** ComfyUI 工作流 JSON 的节点结构（简化） */
interface ComfyUINode {
  inputs: Record<string, unknown>;
  class_type: string;
  _meta?: { title?: string };
}

interface ComfyUIPrompt {
  [nodeId: string]: ComfyUINode;
}

/**
 * 从 ComfyUI 工作流 JSON 中提取正面提示词
 *
 * ComfyUI 的 prompt JSON 结构：
 * - KSampler 节点: inputs.positive = ["18", 0] (引用 CLIPTextEncode 节点的第 0 个输出)
 * - CLIPTextEncode 节点: inputs.text = 实际提示词文本
 *
 * 提取策略：
 * 1. 找到 KSampler → 获取 positive 引用 → 跟随引用找到 CLIPTextEncode → 返回 text
 * 2. 降级：如果找不到 KSampler，遍历所有 CLIPTextEncode 节点，
 *    排除负向提示词（由 KSampler 的 negative 引用标识），返回第一个非空 text
 *
 * @param jsonStr ComfyUI 的 prompt JSON 字符串
 * @returns 正面提示词文本，如果无法提取则返回 null
 */
function extractComfyUIPrompt(jsonStr: string): string | null {
  let prompt: ComfyUIPrompt;
  try {
    prompt = JSON.parse(jsonStr);
  } catch {
    return null;
  }

  if (typeof prompt !== 'object' || prompt === null) return null;

  // 策略 1：找到 KSampler 节点，跟随 positive 引用
  let kSamplerNodeId: string | null = null;
  let negativeNodeId: string | null = null;

  for (const [id, node] of Object.entries(prompt)) {
    if (!node || typeof node !== 'object') continue;
    if (node.class_type === 'KSampler') {
      kSamplerNodeId = id;
      // 记录 negative 引用，用于策略 2 排除
      const negativeRef = node.inputs?.negative;
      if (Array.isArray(negativeRef) && negativeRef.length > 0) {
        negativeNodeId = String(negativeRef[0]);
      }
      break;
    }
  }

  if (kSamplerNodeId) {
    const kSampler = prompt[kSamplerNodeId];
    const positiveRef = kSampler.inputs?.positive;
    if (Array.isArray(positiveRef) && positiveRef.length > 0) {
      const targetNodeId = String(positiveRef[0]);
      const targetNode = prompt[targetNodeId];
      if (targetNode?.inputs?.text && typeof targetNode.inputs.text === 'string') {
        return targetNode.inputs.text.trim();
      }
    }
  }

  // 策略 2（降级）：遍历所有 CLIPTextEncode 节点
  for (const [id, node] of Object.entries(prompt)) {
    if (!node || typeof node !== 'object') continue;
    if (node.class_type === 'CLIPTextEncode' && id !== negativeNodeId) {
      const text = node.inputs?.text;
      if (typeof text === 'string' && text.trim()) {
        return text.trim();
      }
    }
  }

  return null;
}

// ============ ComfyUI Workflow 格式提取（降级） ============

/**
 * ComfyUI workflow 格式的节点（数组形式，与 API prompt 格式不同）
 */
interface ComfyUIWorkflowNode {
  id: number;
  type: string;
  inputs?: Array<{ name: string; type: string; link?: number }>;
  widgets_values?: unknown[];
}

/**
 * ComfyUI workflow 格式
 * nodes 是数组而非对象，节点通过 links 数组引用而非直接引用
 */
interface ComfyUIWorkflow {
  nodes: ComfyUIWorkflowNode[];
  links: Array<[number, number, number, number, number, string]>;
}

/**
 * 从 ComfyUI workflow 格式 JSON 中提取正面提示词（降级方案）
 *
 * Workflow 格式与 API prompt 格式不同：
 * - nodes 是数组，每个节点有数字 id 和 type 字段
 * - 节点间通过 links 数组引用：每个 link 是 [linkId, sourceNodeId, sourceOutput, targetNodeId, targetInput, type]
 * - KSampler 的 positive 输入在 targetInput=1 的位置
 * - CLIPTextEncode 的提示词文本在 widgets_values[0] 中
 *
 * @param jsonStr ComfyUI workflow JSON 字符串
 * @returns 正面提示词文本，如果无法提取则返回 null
 */
function extractComfyUIWorkflow(jsonStr: string): string | null {
  let workflow: ComfyUIWorkflow;
  try {
    workflow = JSON.parse(jsonStr);
  } catch {
    return null;
  }

  if (!workflow?.nodes || !Array.isArray(workflow.nodes) || !workflow?.links) {
    return null;
  }

  // 1. 找到 KSampler 节点
  const kSampler = workflow.nodes.find(
    n => n.type === 'KSampler'
  );
  if (!kSampler) return null;

  // 2. 在 links 中找到 KSampler 的 positive 输入（targetInput=1）
  const positiveLink = workflow.links.find(
    link => link[3] === kSampler.id && link[4] === 1
  );
  if (!positiveLink) return null;

  const sourceNodeId = positiveLink[1]; // link[1] = sourceNodeId

  // 3. 找到源节点（应该是 CLIPTextEncode）
  const sourceNode = workflow.nodes.find(n => n.id === sourceNodeId);
  if (!sourceNode) return null;

  // 4. 提取提示词文本：在 widgets_values[0] 中
  if (
    Array.isArray(sourceNode.widgets_values) &&
    sourceNode.widgets_values.length > 0 &&
    typeof sourceNode.widgets_values[0] === 'string'
  ) {
    const text = sourceNode.widgets_values[0].trim();
    if (text) return text;
  }

  return null;
}

// ============ Stable Diffusion WebUI 格式提取 ============

/**
 * 从 Stable Diffusion WebUI 的参数文本中提取正面提示词
 *
 * SD WebUI parameters 格式：
 * ```
 * {positive prompt}
 * Negative prompt: {negative prompt}
 * Steps: 20, Sampler: Euler a, CFG scale: 7, Seed: 123456, ...
 * ```
 *
 * @param text SD WebUI 的 parameters 文本
 * @returns 正面提示词文本
 */
function extractSDWebUIPrompt(text: string): string | null {
  if (!text || !text.trim()) return null;

  // 查找 "Negative prompt:" 分界点
  const negativeMarker = /\n\s*Negative prompt:\s*/i;
  const match = text.match(negativeMarker);

  if (match && match.index !== undefined) {
    // 提取 "Negative prompt:" 之前的内容作为正面提示词
    return text.substring(0, match.index).trim();
  }

  // 如果没有 "Negative prompt:" 标记，尝试其他分界方式
  // 有些变体使用不同的标记
  const altMarkers = [
    /\n\s*neg(?:ative)?\s*(?:prompt)?\s*:/i,
    /\n\s*Steps?\s*:\s*\d+/i,
  ];

  for (const marker of altMarkers) {
    const m = text.match(marker);
    if (m && m.index !== undefined && m.index > 0) {
      return text.substring(0, m.index).trim();
    }
  }

  // 如果都找不到，返回整个文本（可能整个就是正面提示词）
  return text.trim();
}

// ============ 主入口 ============

/**
 * 从 PNG 文件中提取 AI 生成的正面提示词
 *
 * 支持格式：
 * - ComfyUI (API):    tEXt chunk keyword="prompt"，值为工作流 JSON（优先）
 * - ComfyUI (workflow): tEXt chunk keyword="workflow"，值为节点数组 JSON（降级）
 * - SD WebUI:         tEXt chunk keyword="parameters"，值为参数文本（降级）
 *
 * @param file 浏览器 File 对象（通常是用户通过 <input type="file"> 或拖拽选择的文件）
 * @returns 正面提示词文本，如果无法提取则返回 null
 */
export async function extractPromptFromPNG(file: File): Promise<string | null> {
  // 检查是否为 PNG 文件
  const isPNG =
    file.type === 'image/png' ||
    file.name.toLowerCase().endsWith('.png');

  if (!isPNG) return null;

  try {
    const data = await readFileAsBytes(file);
    const chunks = parsePNGChunks(data);

    if (!chunks.length) return null;

    // 收集所有 tEXt chunk 的 keyword → text 映射
    const textChunks: Record<string, string> = {};
    for (const chunk of chunks) {
      if (chunk.type !== 'tEXt') continue;

      const nullPos = chunk.data.indexOf(0);
      if (nullPos === -1) continue;

      const keyword = new TextDecoder().decode(chunk.data.slice(0, nullPos));
      const text = new TextDecoder().decode(chunk.data.slice(nullPos + 1));
      textChunks[keyword] = text;
    }

    // 按优先级尝试提取：
    // 1) ComfyUI API 格式 (keyword="prompt")
    if (textChunks.prompt) {
      const result = extractComfyUIPrompt(textChunks.prompt);
      if (result) return result;
    }

    // 2) ComfyUI workflow 格式 (keyword="workflow")
    if (textChunks.workflow) {
      const result = extractComfyUIWorkflow(textChunks.workflow);
      if (result) return result;
    }

    // 3) SD WebUI 格式 (keyword="parameters")
    if (textChunks.parameters) {
      const result = extractSDWebUIPrompt(textChunks.parameters);
      if (result) return result;
    }

    return null;
  } catch {
    // 静默处理任何错误，不影响用户正常上传流程
    return null;
  }
}
