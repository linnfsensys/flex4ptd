import React, { ReactNode, useEffect, useCallback } from 'react';
import '../TopBar.css';
import { GUIRadioClient, ModalType, ObjectType, UpdateType } from "../AptdClientTypes";
import WebSocketManager from "../WebSocketManager";
import AptdApp from "../AptdApp";
import { SaveColor } from "../constants/SaveColorEnum";
import UndoManager from "../UndoManager";
import TopStore from "../TopStore";
import AptdButton from "../AptdButton";
import HelpEngine, { HelpLocType } from "../help/HelpEngine";
import ProgressBar from "../widgets/ProgressBar";
import HelpEngineBalloon from '../help/HelpEngineBalloon';
import { GUIPoint } from '../AptdServerTypes';
import { useTopBar } from '../store/topBarStore';

// 导入图标资源
const UndoIcon = require('../assets/icons/iconfinder_reload-refresh-repeat-arrow_2937372.png');
const RedoIcon = require('../assets/icons/iconfinder_reload-refresh-arrow-repeat_2937371.png');
const SaveIcon = require('../assets/icons/iconfinder_exit-enter-leave-door-in_2931189.png');
const GreenRadarIcon = require('../assets/icons/radar_35px_green.gif');
const GoldRadarIcon = require('../assets/icons/radar_35px_gold.gif');
const SensysLogo = require('../assets/icons/sensys_logo_white.svg');
const SensConfigLogo = require('../assets/icons/SensConfig-logo-02.svg');

interface TopBarZustandProps {
  undoEnabled: boolean;
  redoEnabled: boolean;
  saveEnabled: boolean;
  doUndo: () => void;
  doRedo: () => void;
  undoLabel: string;
  redoLabel: string;
  saveColor: SaveColor;
  pingScanStatus: number | null;
  pingScanSecsLeft: number | null;
  savePctComplete: number | null;
  showModal: (modalType: ModalType, description: string, buttonLabels?: string[], buttonOnClicks?: Array<() => void>) => void;
  websocketManager: WebSocketManager | null;
  topStore: TopStore;
  undoManager: UndoManager;
  helpEngine: HelpEngine;
  onHelpGuideClicked: () => void;
  children?: ReactNode;
}

/**
 * TopBarZustand - 使用Zustand实现的TopBar组件
 * 这是TopBar的Zustand版本
 */
const TopBarZustand: React.FC<TopBarZustandProps> = ({
  undoEnabled,
  redoEnabled,
  saveEnabled,
  doUndo,
  doRedo,
  undoLabel,
  redoLabel,
  saveColor,
  pingScanStatus,
  pingScanSecsLeft,
  savePctComplete,
  showModal,
  websocketManager,
  topStore,
  undoManager,
  helpEngine,
  onHelpGuideClicked,
  children
}) => {
  // 使用topBarStore中的状态和操作
  const topBarState = useTopBar();
  
  // 初始化topBarStore状态
  useEffect(() => {
    topBarState.setUndoState(undoEnabled, redoEnabled, undoLabel, redoLabel);
    topBarState.setSaveState(saveEnabled, saveColor);
    topBarState.setSavePctComplete(savePctComplete);
    topBarState.setPingScanStatus(pingScanStatus, pingScanSecsLeft);
    topBarState.setConfiguredDevicesResolved(topStore.getTopState().configuredDevicesResolved);
    // 帮助引擎状态
    topBarState.setHelpEnabled(helpEngine.isHelpEnabled());
  }, [
    undoEnabled, redoEnabled, undoLabel, redoLabel, 
    saveEnabled, saveColor, savePctComplete,
    pingScanStatus, pingScanSecsLeft,
    topStore, helpEngine
  ]);
  
  // 是否显示保存进度
  const saveProgressVisible = savePctComplete !== null && websocketManager !== null;
  
  // 是否有帮助指南
  const helpGuidePresent = helpEngine.isHelpEnabled();
  
  // 是否所有配置的设备已解析
  const configuredDevicesResolved = topStore.getTopState().configuredDevicesResolved;
  
  // 判断节点模式
  const nodeMode = process.env.NODE_ENV;
  const productionMode = nodeMode === 'production';
  
  // 根据生产模式决定按钮文本
  const undoButtonText = productionMode ? '' : 'Undo ' + undoLabel;
  const redoButtonText = productionMode ? '' : 'Redo ' + redoLabel;
  
  // 处理ping扫描状态
  let pingStatus = pingScanStatus;
  if (pingStatus === 100) {
    pingStatus = null;
  }
  
  // 保存进度标签和百分比
  let saveProgressLabel: string;
  let savePercentComplete: number;
  
  if (savePctComplete === null) {
    saveProgressLabel = '';
    savePercentComplete = 0;
  } else if ((websocketManager === null || !websocketManager.thisUserInitiatedSave) &&
             (saveEnabled || saveColor === SaveColor.PINK)) {
    // 如果不在保存中，且保存按钮启用，显示进度为零
    saveProgressLabel = '0% complete';
    savePercentComplete = 0;
  } else {
    saveProgressLabel = '' + savePctComplete + '% complete';
    savePercentComplete = savePctComplete;
  }
  
  // 保存按钮标题
  let saveTitle = '';
  if (saveColor === SaveColor.PINK) {
    saveTitle = 'Please fix all validation errors before Saving';
  } else if (saveColor === SaveColor.YELLOW && pingStatus !== null) {
    saveTitle = 'Please wait for scan to complete before doing Save';
  }
  
  // 函数：检查是否有可用的无线电
  const isRadioAvailable = useCallback((): boolean => {
    const allUnheard = Object.values(topStore.getTopState().radios)
      .every((radio: GUIRadioClient) => radio.unheard);
    return !allUnheard;
  }, [topStore]);
  
  // 字符串属性转换为数字
  const convertStringAttributeToNumber = (stringAttribute: string | null): number => {
    let numberVal = 0;
    if (stringAttribute !== null && stringAttribute.includes("px")) {
      numberVal = Number(stringAttribute.slice(0, stringAttribute.length - 2));
    }
    return numberVal;
  };
  
  // 渲染帮助气球覆盖
  const renderHelpBalloonOverlay = (): ReactNode => {
    let helpBalloonDiv = document.getElementById('balloonOverlayDiv');
    let helpBalloonRect = document.getElementById('SaveBalloon0');
    if (helpBalloonDiv !== null && helpBalloonRect !== null) {
      let balloonRectWidth = convertStringAttributeToNumber(window.getComputedStyle(helpBalloonRect).width);
      balloonRectWidth = balloonRectWidth + 10;
      let saveButton = document.getElementById("save");
      let progessDiv = document.getElementById("saveProgressDiv");
      let progessBar = document.getElementById("saveProgress");
      let redoButton = document.getElementById("redo");
      let buttonBar = document.getElementById("buttonBar");
      if (saveButton !== null && progessBar !== null && progessDiv !== null && redoButton !== null && buttonBar !== null) {
        let progressBarWidth = progessBar.clientWidth;
        let progressDivMarginLeft = convertStringAttributeToNumber(window.getComputedStyle(progessDiv).marginLeft);
        let saveButtonWidth = convertStringAttributeToNumber(window.getComputedStyle(saveButton).width);
        let saveButtonMarginLeft = convertStringAttributeToNumber(window.getComputedStyle(saveButton).marginLeft);
        let buttonBarRight = convertStringAttributeToNumber(window.getComputedStyle(buttonBar).right);
        let rightDis = progressBarWidth + progressDivMarginLeft + saveButtonWidth + saveButtonMarginLeft + buttonBarRight;
        helpBalloonDiv.setAttribute("style", "width:" + balloonRectWidth + "px;right:" + rightDis + "px;");
      }
    }
    
    let balloon: ReactNode = null;
    let balloon_index = -1;
    for (let helpBalloon of topStore.getTopState().helpBalloons) {
      balloon_index += 1;
      if (helpBalloon.location.helpLocType === HelpLocType.BUTTON_TOP_BAR &&
          helpBalloon.location.locObjectType === ObjectType.BUTTON_TOP_BAR) {
        let trayLoc: GUIPoint = { x: 10, y: 10 };
        balloon = (
          <div id={'balloonOverlayDiv'} className="balloonOverlay">
            <svg className="balloonOverlay">
              <g>
                <HelpEngineBalloon
                  key={helpBalloon.location.helpLocType + helpBalloon.location.locObjectId}
                  id={'SaveBalloon' + balloon_index}
                  balloon={helpBalloon}
                  position={trayLoc}
                  mapImageScale={1}
                  helpEngine={helpEngine}
                  onHelpGuideClicked={onHelpGuideClicked}
                />
              </g>
            </svg>
          </div>
        );
      }
    }
    return balloon;
  };
  
  // 处理停止扫描点击
  const onStopScanClicked = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
    AptdApp.blurFocusedField();
    AptdApp.unfocusInfoPanelTextField();
    if (websocketManager === null) {
      console.error('websocketManager is null');
      showModal(ModalType.ONE_BUTTON_ERROR, 'SensConfig is unable to connect.');
    } else {
      // setTimeout 允许文本字段更新到 TopStore
      setTimeout(websocketManager.stopPingScan, 500);
    }
  };
  
  // 处理开始扫描点击
  const onStartScanClicked = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
    AptdApp.blurFocusedField();
    AptdApp.unfocusInfoPanelTextField();
    if (websocketManager === null) {
      console.error('websocketManager is null');
      showModal(ModalType.ONE_BUTTON_ERROR, 'SensConfig is unable to connect.');
    } else {
      // setTimeout 允许文本字段更新到 TopStore
      setTimeout(websocketManager.startPingScan, 500);
    }
  };
  
  // 处理保存点击
  const onSaveClicked = (): void => {
    console.debug('user clicked Save button. about to send Save msg to server');
    if (websocketManager === null) {
      console.error('websocketManager is null');
      showModal(ModalType.ONE_BUTTON_ERROR, 'SensConfig is unable to connect.');
    } else {
      websocketManager.sendSaveMsg();
      topStore.enact({
        actions: [{
          objectType: ObjectType.AWAITING_SAVE_RESULT,
          newData: true,
          updateType: UpdateType.UPDATE,
          objectId: '',
        }],
        description: 'set awaitingSaveResult to true',
      });
      undoManager.clearDoneStack();
    }
  };
  
  // 处理技术支持数据获取
  const onGetTechSupportClicked = (): void => {
    console.debug('user made Get Tech Support gesture.');
    if (websocketManager === null) {
      console.error('websocketManager is null');
      showModal(ModalType.ONE_BUTTON_ERROR, 'SensConfig is unable to connect.');
    } else {
      websocketManager.getTechSupportData();
    }
  };
  
  // 处理产品名称点击
  const onProductNameClick = (event: React.MouseEvent): void => {
    const isMac: boolean = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    if (event.ctrlKey === true || event.metaKey === true || event.altKey === true || event.shiftKey === true) {
      // 抑制标准浏览器行为
      // 注意：在Windows上metaKey是WINDOWS键。
      //       在Mac上，metaKey是COMMAND键。
      event.preventDefault();
    }
    if (event.ctrlKey === true || (isMac && event.metaKey === true)) {
      if (event.shiftKey === true) {
        onGetTechSupportClicked();
      }
    }
  };
  
  // 渲染帮助气球覆盖层
  let helpBalloonOverlay: ReactNode = null;
  if (helpGuidePresent) {
    helpBalloonOverlay = renderHelpBalloonOverlay();
  }
  
  return (
    <div id='topBar'>
      <span id='sensysLogoSpan'>
        <a href='#' id='sensysLogoA' className='logo'
           title='Sensys Networks: SensConfig'
        >
          <img id='sensysLogo' src={SensysLogo} />
        </a>
      </span>
      {helpBalloonOverlay}
      <span className='buttonBar buttonPane' id='helpAndScan'>
        <span id="pingScanAndProgress">
          <AptdButton id='helpButton'
                      text={helpGuidePresent ? 'Hide Help' : 'Show Help'}
                      title=''
                      theClassName='blue'
                      helpEngine={helpEngine}
                      onClick={onHelpGuideClicked}
          />

          {pingStatus !== null ?
            <AptdButton id={'stopScan'}
                        title={''}
                        helpEngine={helpEngine}
                        text={'Stop Finding Devices'}
                        disabled={topStore.getTopState().pingScanNoCancel}
                        onClick={onStopScanClicked}
            />
            :
            <AptdButton id={'startScan'}
                        title={''}
                        helpEngine={helpEngine}
                        text={'Find Devices'}  // 由Robert要求的新标签
                        disabled={!isRadioAvailable() ||
                                  !configuredDevicesResolved}
                        onClick={onStartScanClicked}
            />
          }

          <img src={GoldRadarIcon} width={25} alt={'scan'}
               className={pingStatus === null ? 'invisible' : 'visible'}>
          </img>
          {/* Ping Scan Progress Bar */}
          <ProgressBar
            label={'Device Scan will finish in ' + pingScanSecsLeft + ' secs'}
            label2='Please wait'
            idName={'scanProgress'}
            value={pingScanStatus === null ? 0 : pingScanStatus}
            visible={pingStatus !== null}
            max={100} />
        </span>
      </span>

      <span id="appLogo" onClick={onProductNameClick}>
        {/*SensConfig*/}
        <a href='#' id='sensConfigLogoA' className='logo'
           title=''
        >
          <img id='sensConfigLogo' src={SensConfigLogo} />
        </a>
      </span>

      <span id='awaitingResolution'>
        {configuredDevicesResolved ||
          <>
            <img src={GreenRadarIcon} width={35} height={35}
                 alt={'scanning for devices'}
                 className='visible'>
            </img>
            <span id='awaitingResolutionMsg'>
              Receiving Device Configuration
            </span>
          </>
        }
      </span>
      <span className='buttonBar buttonPane' id='undoRedoSave'>
        {/* save progress bar*/}
        <ProgressBar
          label={saveProgressLabel}
          idName={'saveProgress'}
          value={savePercentComplete}
          visible={saveProgressVisible}
          max={100}
        />

        <AptdButton id={'undo'}
                    title={undoButtonText}
                    helpEngine={helpEngine}
                    disabled={!undoEnabled}
                    imgIcon={UndoIcon} imgWidth={12} imgAlt={'undo action'}
                    text={'Undo'}
                    onClick={() => {
                      AptdApp.blurFocusedField();
                      AptdApp.unfocusInfoPanelTextField();
                      // setTimeout允许文本字段更新到TopStore
                      setTimeout(doUndo, 500);
                    }}
        />
        <AptdButton id={'redo'}
                    title={redoButtonText}
                    helpEngine={helpEngine}
                    disabled={!redoEnabled}
                    imgIcon={RedoIcon} imgWidth={12} imgAlt={'redo action'}
                    text={'Redo'}
                    onClick={() => {
                      AptdApp.blurFocusedField();
                      AptdApp.unfocusInfoPanelTextField();
                      // setTimeout允许文本字段更新到TopStore
                      setTimeout(doRedo, 500);
                    }}
        />
        <AptdButton id={'save'}
                    title={saveTitle}
                    helpEngine={helpEngine}
                    disabled={!saveEnabled}
                    imgIcon={SaveIcon} imgWidth={12} imgAlt={'save configuration'}
                    text={'Save'}
                    onClick={() => {
                      AptdApp.blurFocusedField();
                      AptdApp.unfocusInfoPanelTextField();
                      // setTimeout允许文本字段更新到TopStore
                      setTimeout(onSaveClicked, 1000);
                    }}
                    theClassName={saveColor === SaveColor.PINK ?
                      'pink red' : saveColor}
        />
        {children}
      </span>
    </div>
  );
};

export default TopBarZustand; 