import React from 'react';
import { GUICCInterfaceBaseClient } from '../AptdClientTypes';
import CCChannelIconG from './CCChannelIconG';
import { ChannelNumber } from '../AptdServerTypes';
import './CCCardG.css';

interface CCCardGProps {
  datum: GUICCInterfaceBaseClient;
  selected: boolean;
  detectedChannels: Set<string>;
  x: number;
  y: number;
  onMouseDown?: (event: React.MouseEvent<SVGGElement>) => void;
  onMouseEnter?: (event: React.MouseEvent<SVGGElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<SVGGElement>) => void;
}

const CCCardG: React.FC<CCCardGProps> = ({
  datum,
  selected,
  detectedChannels,
  x,
  y,
  onMouseDown,
  onMouseEnter,
  onMouseLeave
}) => {
  const cardWidth = 50;
  const cardHeight = 63;
  const channelHeight = 15;
  
  // 从 ID 中提取 shelf 和 slot
  const getShelfSlot = (id: string): string => {
    const parts = id.split('-');
    if (parts.length >= 2) {
      // 移除 'S' 前缀
      const shelf = parts[0].replace(/^S/, '');
      const slot = parts[1].replace(/^S/, '');
      return `${shelf}-${slot}`;
    }
    return id;
  };
  
  // 生成通道图标
  const makeChannelIcons = () => {
    const channelIcons: React.ReactNode[] = [];
    const channels = datum.channelsById || {};
    
    Object.entries(channels).forEach(([channelId, channel], index) => {
      const channelKey = `${datum.id}-${channelId}`;
      const isDetected = detectedChannels.has(channelKey);
      
      channelIcons.push(
        <CCChannelIconG
          key={channelKey}
          id={channelId}
          channelKey={channelKey}
          channelNo={channel.channelNumber as ChannelNumber}
          disabled={!channel.enabled}
          detect={isDetected}
          height={channelHeight}
          x={2}
          y={1 + index * (channelHeight + 1)} // 调整通道间距
          onMouseDown={onMouseDown}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />
      );
    });
    
    return channelIcons;
  };
  
  const transform = `translate(${x}, ${y})`;
  const shelfSlot = getShelfSlot(datum.id);
  
  return (
    <g 
      className={`ccCardGOuter ccCardG selectable dotid-${datum.id}`}
      transform={transform}
      data-dotid={datum.id}
      data-devicetype="CC_CARD"
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* 卡片背景 */}
      <rect 
        className="ccCard"
        width={cardWidth}
        height={cardHeight}
      />
      
      {/* 卡片内部矩形 */}
      <rect 
        className={`cardRect ${selected ? 'selected' : ''}`}
        width={35}
        height={59}
        x={0}
        y={2}
      />
      
      {/* 卡片文本 - 旋转90度 */}
      <text 
        className="cardText" 
        x={46} 
        y={13} 
        transform="rotate(90, 40, 15)"
      >
        {shelfSlot}
      </text>
      
      {/* 渲染通道图标 */}
      {makeChannelIcons()}
    </g>
  );
};

export default CCCardG; 