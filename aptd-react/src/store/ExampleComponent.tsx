import React, { useEffect } from 'react'
import { 
  useAppState, 
  useSelection, 
  useMapDevices, 
  useModals, 
  useActions,
  useValidation,
  useConfig,
  useHelp,
  useMapSettings
} from './hooks'
import { ModalType, ObjectType, UpdateType } from '../AptdClientTypes'

/**
 * 示例组件，展示如何使用Zustand hooks
 * 这个组件仅用于演示，不应该在实际应用中使用
 */
export const ExampleComponent: React.FC = () => {
  // 获取应用状态
  const { loading, disabled, userid } = useAppState()
  
  // 获取选择状态
  const { selected, selectDevice, clearSelection } = useSelection()
  
  // 获取地图设备
  const { 
    ap, 
    radios, 
    mapSensors, 
    mapRepeaters, 
    getMapSensor, 
    getMapRepeater 
  } = useMapDevices()
  
  // 获取模态框操作
  const { showModal, dismissModal, modalStack } = useModals()
  
  // 获取操作方法
  const { dispatch, updateAP, updateRadio, updateMapSensor } = useActions()
  
  // 获取验证错误
  const { getFieldErrors, getGlobalErrors } = useValidation()
  
  // 获取配置操作
  const { clearConfig } = useConfig()
  
  // 获取帮助状态
  const { helpBalloons, helpHiLights } = useHelp()
  
  // 获取地图设置
  const { mapSettings, updateMapSettings } = useMapSettings()
  
  // 组件加载时执行一些操作
  useEffect(() => {
    console.log('组件已加载')
    
    // 显示一个模态框
    showModal(
      ModalType.ONE_BUTTON_SUCCESS,
      '这是一个示例模态框',
      ['确定'],
      [() => console.log('用户确认了操作')]
    )
    
    // 如果有传感器，选择第一个
    const sensorIds = Object.keys(mapSensors)
    if (sensorIds.length > 0) {
      selectDevice(ObjectType.MAP_SENSOR, sensorIds[0])
    }
    
    // 更新AP配置（示例）
    if (ap) {
      updateAP({
        serialNumber: '12345',
        hostname: 'example-ap'
      })
    }
    
    // 更新地图设置
    updateMapSettings({
      showRFLinks: true,
      showCCLinks: true
    })
    
  }, [])
  
  // 渲染组件
  return (
    <div className="example-component">
      <h2>Zustand Hooks 示例</h2>
      
      <section>
        <h3>应用状态</h3>
        <p>加载中: {loading ? '是' : '否'}</p>
        <p>已禁用: {disabled ? '是' : '否'}</p>
        <p>用户ID: {userid || '未登录'}</p>
      </section>
      
      <section>
        <h3>选择状态</h3>
        <p>已选择设备: {selected ? `${selected.selectedDeviceType} - ${selected.selectedDotid}` : '无'}</p>
        <button onClick={() => clearSelection()}>清除选择</button>
      </section>
      
      <section>
        <h3>设备状态</h3>
        <p>AP: {ap ? ap.serialNumber : '无'}</p>
        <p>无线电数量: {Object.keys(radios).length}</p>
        <p>传感器数量: {Object.keys(mapSensors).length}</p>
        <p>中继器数量: {Object.keys(mapRepeaters).length}</p>
      </section>
      
      <section>
        <h3>操作</h3>
        <button 
          onClick={() => showModal(ModalType.ONE_BUTTON_SUCCESS, '这是一个信息模态框')}
          disabled={disabled}
        >
          显示模态框
        </button>
        <button 
          onClick={() => clearConfig()}
          disabled={disabled}
        >
          清除配置
        </button>
      </section>
    </div>
  )
}

export default ExampleComponent 