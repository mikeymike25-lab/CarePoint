import React from 'react';

/**
 * Skeleton loader for Orders page cards
 */
export const OrderCardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-3 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs animate-pulse"
        >
          {/* Top row: Order ID and Status */}
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <div className="w-16 h-4 bg-slate-200 rounded-md" />
              <div className="w-20 h-4 bg-slate-100 rounded-md" />
            </div>
            <div className="w-20 h-6 bg-slate-200 rounded-full" />
          </div>

          {/* Pharmacy & Items */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="w-36 h-4 bg-slate-200 rounded" />
              <div className="w-24 h-3 bg-slate-100 rounded" />
            </div>
          </div>

          {/* Bottom row: Total & Date */}
          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <div className="w-24 h-3 bg-slate-100 rounded" />
            <div className="w-16 h-5 bg-slate-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton loader for Inquiries ("Your Chats") list
 */
export const ChatListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 divide-y divide-slate-100 overflow-hidden animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-center">
              <div className="w-32 h-4 bg-slate-200 rounded" />
              <div className="w-12 h-3 bg-slate-100 rounded" />
            </div>
            <div className="w-48 h-3.5 bg-slate-100 rounded" />
            <div className="w-28 h-3 bg-slate-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton loader for individual Chat conversation messages
 */
export const ChatMessageSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="space-y-4 p-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => {
        const isMine = i % 2 !== 0;
        return (
          <div key={i} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
            {!isMine && <div className="w-14 h-3 bg-slate-200 rounded mb-1.5 ml-1" />}
            <div 
              className={`rounded-2xl p-3.5 ${
                isMine ? 'bg-teal-100 w-2/3 rounded-br-none' : 'bg-slate-200 w-3/5 rounded-bl-none'
              }`}
            >
              <div className="h-3.5 bg-white/70 rounded w-full mb-1.5" />
              <div className="h-3.5 bg-white/50 rounded w-4/5" />
            </div>
            <div className="w-10 h-2.5 bg-slate-200 rounded mt-1 mx-1" />
          </div>
        );
      })}
    </div>
  );
};

/**
 * Skeleton loader for OrderDetail page
 */
export const OrderDetailSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 max-w-2xl mx-auto w-full px-4 py-4 animate-pulse">
      {/* Header status block */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex justify-between items-center">
          <div className="w-24 h-5 bg-slate-200 rounded" />
          <div className="w-20 h-6 bg-slate-200 rounded-full" />
        </div>
        <div className="w-48 h-3.5 bg-slate-100 rounded" />
      </div>

      {/* Pharmacy info */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-3.5">
        <div className="w-12 h-12 bg-slate-200 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="w-36 h-4 bg-slate-200 rounded" />
          <div className="w-48 h-3 bg-slate-100 rounded" />
        </div>
      </div>

      {/* Items list */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="w-28 h-4 bg-slate-200 rounded mb-3" />
        <div className="space-y-2.5">
          <div className="flex justify-between">
            <div className="w-40 h-3.5 bg-slate-100 rounded" />
            <div className="w-14 h-3.5 bg-slate-200 rounded" />
          </div>
          <div className="flex justify-between">
            <div className="w-32 h-3.5 bg-slate-100 rounded" />
            <div className="w-14 h-3.5 bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
};
