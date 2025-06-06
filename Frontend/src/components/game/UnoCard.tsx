import React from 'react';
import { cn } from '../../lib/utils';

interface Card {
  color: 'red' | 'blue' | 'green' | 'yellow' | 'black';
  value: string | number;
  type: 'number' | 'action' | 'wild';
}

interface UnoCardProps {
  card: Card;
  className?: string;
  onClick?: () => void;
  isPlayable?: boolean;
  isSelected?: boolean;
  size?: 'small' | 'normal' | 'large';
}

const UnoCard: React.FC<UnoCardProps> = ({ 
  card, 
  className, 
  onClick, 
  isPlayable = false, 
  isSelected = false,
  size = 'normal'
}) => {
  const getCardColorClass = (color: string) => {
    switch (color) {
      case 'red': return 'uno-card-red';
      case 'green': return 'uno-card-green';
      case 'blue': return 'uno-card-blue';
      case 'yellow': return 'uno-card-yellow';
      case 'black': return 'uno-card-black';
      default: return 'uno-card-black';
    }
  };

  const getSizeClass = (size: string) => {
    switch (size) {
      case 'small': return 'w-12 h-18';
      case 'large': return 'w-20 h-28';
      default: return 'w-16 h-24';
    }
  };

  const getCardSymbol = (value: string | number) => {
    switch (value) {
      case 'skip': return '⊘';
      case 'reverse': return '⟲';
      case 'draw2': return '+2';
      case 'wild': return '🌈';
      case 'wild4': return '+4';
      default: return value;
    }
  };

  return (
    <div
      className={cn(
        'uno-card',
        getCardColorClass(card.color),
        getSizeClass(size),
        {
          'uno-card-playable': isPlayable,
          'uno-card-selected': isSelected,
          'cursor-pointer': onClick,
          'opacity-60': !isPlayable && onClick,
        },
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-center h-full text-2xl font-bold">
        {getCardSymbol(card.value)}
      </div>
    </div>
  );
};

export default UnoCard;
