import React from 'react';

interface Props {
  licenseType: string;
  licenseNote?: string;
  systemCopyright?: string;
}

const LICENSE_LABELS: Record<string, { label: string; color: string }> = {
  all_rights: { label: '全権利保留', color: 'bg-gray-100 text-gray-600' },
  cc_by: { label: 'CC BY', color: 'bg-green-50 text-green-700' },
  cc_by_sa: { label: 'CC BY-SA', color: 'bg-green-50 text-green-700' },
  cc_by_nc: { label: 'CC BY-NC', color: 'bg-blue-50 text-blue-700' },
  cc_by_nc_sa: { label: 'CC BY-NC-SA', color: 'bg-blue-50 text-blue-700' },
  free_use: { label: 'フリー利用', color: 'bg-emerald-50 text-emerald-700' },
  custom: { label: 'カスタム', color: 'bg-yellow-50 text-yellow-700' },
};

export default function LicenseBadge({ licenseType, licenseNote, systemCopyright }: Props) {
  const license = LICENSE_LABELS[licenseType] || LICENSE_LABELS.all_rights;

  return (
    <div className="border border-gray-200 rounded-lg p-3 text-xs space-y-1">
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded-full font-medium ${license.color}`}>
          {license.label}
        </span>
      </div>
      {systemCopyright && (
        <p className="text-gray-500">{systemCopyright}</p>
      )}
      {licenseNote && (
        <p className="text-gray-500">{licenseNote}</p>
      )}
    </div>
  );
}
