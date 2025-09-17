import React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const MessageBubble = ({ message, isOwn, showStatus = true }) => {
  const getStatusIcon = (status) => {
    if (!showStatus || !isOwn) return null;
    
    switch (status) {
      case 'sending':
        return <div className="w-4 h-4 rounded-full bg-gray-300 animate-pulse" />;
      case 'sent':
        return <Check className="w-4 h-4 text-gray-500" />;
      case 'delivered':
        return <CheckCheck className="w-4 h-4 text-gray-500" />;
      case 'read':
        return <CheckCheck className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'sending':
        return 'Enviando...';
      case 'sent':
        return 'Enviado';
      case 'delivered':
        return 'Entregado';
      case 'read':
        return 'Leído';
      default:
        return '';
    }
  };

  return (
    <div className={cn(
      "flex flex-col max-w-xs lg:max-w-md px-4 py-2 rounded-lg",
      isOwn ? "ml-auto bg-blue-500 text-white" : "mr-auto bg-gray-200 text-gray-900"
    )}>
      <div className="break-words">
        {message.content}
      </div>
      
      <div className={cn(
        "flex items-center justify-end mt-1 text-xs",
        isOwn ? "text-blue-100" : "text-gray-500"
      )}>
        <span className="mr-1">
          {new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
        {getStatusIcon(message.status)}
        {message.status && (
          <span className="ml-1 text-xs opacity-75">
            {getStatusText(message.status)}
          </span>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;



