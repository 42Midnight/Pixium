import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { isElectronAvailable } from '../../services/electron';
import TitleBar from '../common/TitleBar';
import TemplateManager from './TemplateManager';
import './Settings.css';

export default function Settings() {
  const navigate = useNavigate();
  const location = useLocation();
  const previousPath = location.state?.previousPath || '/';
  const previousState = location.state?.previousState;

  const [activeTab, setActiveTab] = useState<'general' | 'upload'>('general');
  const { settings, updateSetting } = useSettings();

  const handleBack = () => {
    navigate(previousPath, { state: previousState });
  };

  const handleSelectDownloadPath = async () => {
    if (!isElectronAvailable()) return;
    const result = await window.electronAPI!.selectFolder();
    if (result.success && result.path) {
      updateSetting('downloadPath', result.path);
    }
  };

  return (
    <div className="settings-page">
      <TitleBar title="设置" onBack={handleBack} />

      <div className="settings-container">
        <div className="settings-sidebar">
          <div className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>
            <span className="tab-icon">⚙️</span>常规设置
          </div>
          <div className={`settings-tab ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}>
            <span className="tab-icon">📁</span>上传模板
          </div>
        </div>

        <div className="settings-main">
          {activeTab === 'general' && (
            <div className="settings-section">
              <h3 className="section-title">常规设置</h3>
              <div className="setting-item-row">
                <div className="setting-item">
                  <label className="setting-label">相册添加位置</label>
                  <div className="setting-options">
                    <label className={`setting-option ${settings.collectionSortOrder === 'asc' ? 'selected' : ''}`}>
                      <input type="radio" name="collectionPosition" value="asc" checked={settings.collectionSortOrder === 'asc'}
                        onChange={() => updateSetting('collectionSortOrder', 'asc')} />
                      <span>前面</span>
                    </label>
                    <label className={`setting-option ${settings.collectionSortOrder === 'desc' ? 'selected' : ''}`}>
                      <input type="radio" name="collectionPosition" value="desc" checked={settings.collectionSortOrder === 'desc'}
                        onChange={() => updateSetting('collectionSortOrder', 'desc')} />
                      <span>后面</span>
                    </label>
                  </div>
                </div>

                <div className="setting-item">
                  <label className="setting-label">作品排序方式</label>
                  <div className="setting-options">
                    <label className={`setting-option ${settings.workSortOrder === 'asc' ? 'selected' : ''}`}>
                      <input type="radio" name="workSortOrder" value="asc" checked={settings.workSortOrder === 'asc'}
                        onChange={() => updateSetting('workSortOrder', 'asc')} />
                      <span>升序</span>
                    </label>
                    <label className={`setting-option ${settings.workSortOrder === 'desc' ? 'selected' : ''}`}>
                      <input type="radio" name="workSortOrder" value="desc" checked={settings.workSortOrder === 'desc'}
                        onChange={() => updateSetting('workSortOrder', 'desc')} />
                      <span>降序</span>
                    </label>
                  </div>
                </div>

                <div className="setting-item">
                  <label className="setting-label">显示图片文件名</label>
                  <div className="setting-options">
                    <label className={`setting-option ${settings.showImageFilename ? 'selected' : ''}`}>
                      <input type="radio" name="showImageFilename" value="true" checked={settings.showImageFilename}
                        onChange={() => updateSetting('showImageFilename', true)} />
                      <span>显示</span>
                    </label>
                    <label className={`setting-option ${!settings.showImageFilename ? 'selected' : ''}`}>
                      <input type="radio" name="showImageFilename" value="false" checked={!settings.showImageFilename}
                        onChange={() => updateSetting('showImageFilename', false)} />
                      <span>隐藏</span>
                    </label>
                  </div>
                </div>

                <div className="setting-item">
                  <label className="setting-label">显示日期分组</label>
                  <div className="setting-options">
                    <label className={`setting-option ${settings.showDateGrouping ? 'selected' : ''}`}>
                      <input type="radio" name="showDateGrouping" value="true" checked={settings.showDateGrouping}
                        onChange={() => updateSetting('showDateGrouping', true)} />
                      <span>显示</span>
                    </label>
                    <label className={`setting-option ${!settings.showDateGrouping ? 'selected' : ''}`}>
                      <input type="radio" name="showDateGrouping" value="false" checked={!settings.showDateGrouping}
                        onChange={() => updateSetting('showDateGrouping', false)} />
                      <span>隐藏</span>
                    </label>
                  </div>
                </div>

                <div className="setting-item">
                  <label className="setting-label">喜欢排序方式</label>
                  <div className="setting-options">
                    <label className={`setting-option ${settings.favoritesSortOrder === 'newest' ? 'selected' : ''}`}>
                      <input type="radio" name="favoritesSortOrder" value="newest" checked={settings.favoritesSortOrder === 'newest'}
                        onChange={() => updateSetting('favoritesSortOrder', 'newest')} />
                      <span>最新喜欢在前</span>
                    </label>
                    <label className={`setting-option ${settings.favoritesSortOrder === 'oldest' ? 'selected' : ''}`}>
                      <input type="radio" name="favoritesSortOrder" value="oldest" checked={settings.favoritesSortOrder === 'oldest'}
                        onChange={() => updateSetting('favoritesSortOrder', 'oldest')} />
                      <span>最早喜欢在前</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="setting-item download-path-item">
                <label className="setting-label">图片下载位置</label>
                <div className="download-path-container">
                  <input type="text" value={settings.downloadPath} readOnly
                    placeholder="请选择下载路径" className="download-path-input"
                    onChange={e => updateSetting('downloadPath', e.target.value)} />
                  <button className="browse-button" onClick={handleSelectDownloadPath}>浏览</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'upload' && <TemplateManager />}
        </div>
      </div>
    </div>
  );
}
