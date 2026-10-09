'use client';

import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { CustomerReportModal } from './CustomerReportModal';

interface CustomerReportActionProps {
  customerId: string;
  customerName?: string;
  className?: string;
}

export const CustomerReportAction: React.FC<CustomerReportActionProps> = ({
  customerId,
  customerName,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        title="View Full Profile Report"
        className={`p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors flex items-center gap-1 text-xs font-semibold ${className}`}
      >
        <FileText className="w-4 h-4 text-primary" />
        <span className="hidden sm:inline">Report</span>
      </button>

      {isOpen && (
        <CustomerReportModal
          customerId={customerId}
          customerName={customerName}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
