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
  const cardWidth = 32;
  const cardHeight = 120;
  const channelHeight = 12;
  
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
          y={index * (channelHeight + 2) + 20} // 20px offset for card header
          onMouseDown={onMouseDown}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />
      );
    });
    
    return channelIcons;
  };
  
  // 确定卡片的类名
  let cardClassName = 'ccCardRect';
  if (selected) {
    cardClassName += ' selected';
  }
  
  const transform = `translate(${x}, ${y})`;
  
  return (
    <g 
      className={`ccCardG dotid-${datum.id}`}
      transform={transform}
      data-dotid={datum.id}
      data-devicetype="CC_CARD"
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* 卡片背景 */}
      <rect 
        className={cardClassName}
        width={cardWidth}
        height={cardHeight}
        rx={4}
      />
      
      {/* 卡片标题 */}
      <text className="ccCardTitle" x={cardWidth / 2} y={12}>
        {datum.id.split('-')[1] || 'CC'}
      </text>
      
      {/* 渲染通道图标 */}
      {makeChannelIcons()}
    </g>
  );
};

export default CCCardG; 