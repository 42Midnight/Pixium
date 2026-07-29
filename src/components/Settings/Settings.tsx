import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { isElectronAvailable } from '../../services/electron';
import TitleBar from '../common/TitleBar';
import TemplateManager from './TemplateManager';
import ImportExport from './ImportExport';
import styles from './Settings.module.css';

export default function Settings() {
  const navigate = useNavigate();
  const location = useLocation();
  const previousPath = location.state?.previousPath || '/';
  const previousState = location.state?.previousState;

  const [activeTab, setActiveTab] = useState<'general' | 'upload' | 'importExport'>('general');
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
    <div className={styles.settingsPage}>
      <TitleBar title="设置" onBack={handleBack} />

      <div className={styles.settingsContainer}>
        <div className={styles.settingsSidebar}>
          <div className={`${styles.settingsTab} ${activeTab === 'general' ? styles.active : ''}`} onClick={() => setActiveTab('general')}>
            常规设置
          </div>
          <div className={`${styles.settingsTab} ${activeTab === 'upload' ? styles.active : ''}`} onClick={() => setActiveTab('upload')}>
            上传模板
          </div>
          <div className={`${styles.settingsTab} ${activeTab === 'importExport' ? styles.active : ''}`} onClick={() => setActiveTab('importExport')}>
            导入导出
          </div>
        </div>

        <div className={styles.settingsMain}>
          {activeTab === 'general' && (
            <div className={styles.settingsSection}>
              <h3 className={styles.sectionTitle}>常规设置</h3>
              <div className={styles.settingItemRow}>
                <div className={styles.settingItem}>
                  <label className={styles.settingLabel}>相册添加位置</label>
                  <div className={styles.settingOptions}>
                    <label className={`${styles.settingOption} ${settings.collectionSortOrder === 'asc' ? styles.selected : ''}`}>
                      <input type="radio" name="collectionPosition" value="asc" checked={settings.collectionSortOrder === 'asc'}
                        onChange={() => updateSetting('collectionSortOrder', 'asc')} />
                      <span>前面</span>
                    </label>
                    <label className={`${styles.settingOption} ${settings.collectionSortOrder === 'desc' ? styles.selected : ''}`}>
                      <input type="radio" name="collectionPosition" value="desc" checked={settings.collectionSortOrder === 'desc'}
                        onChange={() => updateSetting('collectionSortOrder', 'desc')} />
                      <span>后面</span>
                    </label>
                  </div>
                </div>

                <div className={styles.settingItem}>
                  <label className={styles.settingLabel}>作品排序方式</label>
                  <div className={styles.settingOptions}>
                    <label className={`${styles.settingOption} ${settings.workSortOrder === 'asc' ? styles.selected : ''}`}>
                      <input type="radio" name="workSortOrder" value="asc" checked={settings.workSortOrder === 'asc'}
                        onChange={() => updateSetting('workSortOrder', 'asc')} />
                      <span>升序</span>
                    </label>
                    <label className={`${styles.settingOption} ${settings.workSortOrder === 'desc' ? styles.selected : ''}`}>
                      <input type="radio" name="workSortOrder" value="desc" checked={settings.workSortOrder === 'desc'}
                        onChange={() => updateSetting('workSortOrder', 'desc')} />
                      <span>降序</span>
                    </label>
                  </div>
                </div>

                <div className={styles.settingItem}>
                  <label className={styles.settingLabel}>显示图片文件名</label>
                  <div className={styles.settingOptions}>
                    <label className={`${styles.settingOption} ${settings.showImageFilename ? styles.selected : ''}`}>
                      <input type="radio" name="showImageFilename" value="true" checked={settings.showImageFilename}
                        onChange={() => updateSetting('showImageFilename', true)} />
                      <span>显示</span>
                    </label>
                    <label className={`${styles.settingOption} ${!settings.showImageFilename ? styles.selected : ''}`}>
                      <input type="radio" name="showImageFilename" value="false" checked={!settings.showImageFilename}
                        onChange={() => updateSetting('showImageFilename', false)} />
                      <span>隐藏</span>
                    </label>
                  </div>
                </div>

                <div className={styles.settingItem}>
                  <label className={styles.settingLabel}>显示日期分组</label>
                  <div className={styles.settingOptions}>
                    <label className={`${styles.settingOption} ${settings.showDateGrouping ? styles.selected : ''}`}>
                      <input type="radio" name="showDateGrouping" value="true" checked={settings.showDateGrouping}
                        onChange={() => updateSetting('showDateGrouping', true)} />
                      <span>显示</span>
                    </label>
                    <label className={`${styles.settingOption} ${!settings.showDateGrouping ? styles.selected : ''}`}>
                      <input type="radio" name="showDateGrouping" value="false" checked={!settings.showDateGrouping}
                        onChange={() => updateSetting('showDateGrouping', false)} />
                      <span>隐藏</span>
                    </label>
                  </div>
                </div>

                <div className={styles.settingItem}>
                  <label className={styles.settingLabel}>喜欢排序方式</label>
                  <div className={styles.settingOptions}>
                    <label className={`${styles.settingOption} ${settings.favoritesSortOrder === 'newest' ? styles.selected : ''}`}>
                      <input type="radio" name="favoritesSortOrder" value="newest" checked={settings.favoritesSortOrder === 'newest'}
                        onChange={() => updateSetting('favoritesSortOrder', 'newest')} />
                      <span>最新喜欢在前</span>
                    </label>
                    <label className={`${styles.settingOption} ${settings.favoritesSortOrder === 'oldest' ? styles.selected : ''}`}>
                      <input type="radio" name="favoritesSortOrder" value="oldest" checked={settings.favoritesSortOrder === 'oldest'}
                        onChange={() => updateSetting('favoritesSortOrder', 'oldest')} />
                      <span>最早喜欢在前</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className={`${styles.settingItem} ${styles.downloadPathItem}`}>
                <label className={styles.settingLabel}>图片下载位置</label>
                <div className={styles.downloadPathContainer}>
                  <input type="text" value={settings.downloadPath} readOnly
                    placeholder="请选择下载路径" className={styles.downloadPathInput}
                    onChange={e => updateSetting('downloadPath', e.target.value)} />
                  <button className={styles.browseButton} onClick={handleSelectDownloadPath}>浏览</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'upload' && <TemplateManager />}
          {activeTab === 'importExport' && <ImportExport />}
        </div>
      </div>
    </div>
  );
}
