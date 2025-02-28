import React, { useState } from 'react';
import { useMapDevices, useActions, useAppState } from '../store/hooks';
import { ObjectType, UpdateType, GUIRadioClient } from '../AptdClientTypes';
import AptdButton from '../AptdButton';

/**
 * RadioPanel组件 - 使用Zustand hooks管理无线电设备
 */
const RadioPanel: React.FC = () => {
  // 使用Zustand hooks获取状态和操作
  const { radios } = useMapDevices();
  const { updateRadio } = useActions();
  const { disabled } = useAppState();
  
  // 本地状态，用于跟踪选中的无线电
  const [selectedRadioId, setSelectedRadioId] = useState<string | null>(null);
  
  // 获取选中的无线电
  const selectedRadio = selectedRadioId ? radios[selectedRadioId] : null;
  
  // 处理选择无线电
  const handleSelectRadio = (radioId: string) => {
    setSelectedRadioId(radioId);
  };
  
  // 处理更新无线电颜色代码
  const handleUpdateColorCode = () => {
    if (selectedRadioId) {
      // 随机生成1-15之间的颜色代码
      const newColorCode = Math.floor(Math.random() * 15) + 1;
      updateRadio(selectedRadioId, {
        colorCode: newColorCode
      });
    }
  };
  
  return (
    <div className="radio-panel">
      <h3>无线电设备管理</h3>
      
      <div className="radio-list">
        <h4>设备列表 ({Object.keys(radios).length})</h4>
        {Object.keys(radios).length > 0 ? (
          <ul>
            {Object.entries(radios).map(([radioId, radio]) => (
              <li 
                key={radioId}
                className={selectedRadioId === radioId ? 'selected' : ''}
                onClick={() => handleSelectRadio(radioId)}
              >
                无线电 {radio.id64.substring(0, 8)}
              </li>
            ))}
          </ul>
        ) : (
          <p>没有无线电设备</p>
        )}
      </div>
      
      {selectedRadio && (
        <div className="radio-details">
          <h4>设备详情</h4>
          <div>
            <p><strong>ID:</strong> {selectedRadio.id64}</p>
            <p><strong>信道:</strong> {selectedRadio.knownChannel || 'N/A'}</p>
            <p><strong>颜色代码:</strong> {selectedRadio.colorCode}</p>
            <p><strong>硬件版本:</strong> {selectedRadio.hardwareVersion}</p>
            <p><strong>固件版本:</strong> {selectedRadio.firmware || 'N/A'}</p>
          </div>
          
          <div className="radio-actions">
            <AptdButton
              id="updateColorCodeButton"
              text="更新颜色代码"
              title="随机更新无线电颜色代码"
              onClick={handleUpdateColorCode}
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RadioPanel; 