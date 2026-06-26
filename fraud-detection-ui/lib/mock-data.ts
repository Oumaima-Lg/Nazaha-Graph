export const mockDashboardData = {
  kpis: [
    {
      id: 1,
      labelKey: 'kpis.fraudCasesDetected',
      value: '23',
      change: '+5.2%',
      icon: 'AlertTriangle'
    },
    {
      id: 2,
      labelKey: 'kpis.underInvestigation',
      value: '8',
      change: '+12%',
      icon: 'Clock'
    },
    {
      id: 3,
      labelKey: 'kpis.contractsAnalyzed',
      value: '1 247',
      change: '+18.3%',
      icon: 'FileText'
    }
  ],
  chartData: [
    { monthKey: 'months.jan', cases: 4, resolved: 2, pending: 2 },
    { monthKey: 'months.feb', cases: 6, resolved: 3, pending: 3 },
    { monthKey: 'months.mar', cases: 8, resolved: 5, pending: 3 },
    { monthKey: 'months.apr', cases: 7, resolved: 4, pending: 3 },
    { monthKey: 'months.may', cases: 9, resolved: 5, pending: 4 },
    { monthKey: 'months.jun', cases: 12, resolved: 7, pending: 5 },
    { monthKey: 'months.jul', cases: 15, resolved: 9, pending: 6 },
    { monthKey: 'months.aug', cases: 18, resolved: 11, pending: 7 }
  ],
  alerts: [
    {
      id: 1,
      titleKey: 'alertData.suspiciousBidding.title',
      descriptionKey: 'alertData.suspiciousBidding.description',
      severity: 'high',
      date: '2024-01-15',
      status: 'investigating'
    },
    {
      id: 2,
      titleKey: 'alertData.priceFixing.title',
      descriptionKey: 'alertData.priceFixing.description',
      severity: 'high',
      date: '2024-01-14',
      status: 'investigating'
    },
    {
      id: 3,
      titleKey: 'alertData.unusualCoalition.title',
      descriptionKey: 'alertData.unusualCoalition.description',
      severity: 'medium',
      date: '2024-01-12',
      status: 'pending'
    },
    {
      id: 4,
      titleKey: 'alertData.documentAnomaly.title',
      descriptionKey: 'alertData.documentAnomaly.description',
      severity: 'medium',
      date: '2024-01-10',
      status: 'resolved'
    }
  ]
};

export const mockGraphData = {
  nodes: [
    { id: '1', labelKey: 'entities.companiesA', type: 'company', collusion: true },
    { id: '2', labelKey: 'entities.companiesB', type: 'company', collusion: true },
    { id: '3', labelKey: 'entities.companiesC', type: 'company', collusion: true },
    { id: '4', labelKey: 'entities.tender1', type: 'tender', collusion: false },
    { id: '5', labelKey: 'entities.directorX', type: 'person', collusion: true },
    { id: '6', labelKey: 'entities.directorY', type: 'person', collusion: false },
    { id: '7', labelKey: 'entities.directorZ', type: 'person', collusion: false },
    { id: '8', labelKey: 'entities.companiesD', type: 'company', collusion: false },
    { id: '9', labelKey: 'entities.commonSupplier', type: 'supplier', collusion: true },
    { id: '10', labelKey: 'entities.tender2', type: 'tender', collusion: false },
    { id: '11', labelKey: 'entities.purchasingOffice', type: 'agency', collusion: false },
    { id: '12', labelKey: 'entities.companiesE', type: 'company', collusion: false }
  ],
  edges: [
    { source: '1', target: '5', weight: 'strong' },
    { source: '2', target: '5', weight: 'strong' },
    { source: '3', target: '5', weight: 'strong' },
    { source: '1', target: '4', weight: 'medium' },
    { source: '2', target: '4', weight: 'medium' },
    { source: '3', target: '4', weight: 'medium' },
    { source: '9', target: '1', weight: 'strong' },
    { source: '9', target: '2', weight: 'strong' },
    { source: '5', target: '6', weight: 'weak' },
    { source: '1', target: '10', weight: 'weak' },
    { source: '6', target: '11', weight: 'medium' },
    { source: '8', target: '4', weight: 'weak' },
    { source: '2', target: '12', weight: 'weak' }
  ]
};

export const mockContracts = [
  {
    id: 'CONT-2024-001',
    titleKey: 'contracts.contractData.contract1',
    vendorKey: 'contracts.vendors.vendorA',
    amount: '€2,500,000',
    date: '2024-01-15',
    status: 'suspect',
    riskScore: 92
  },
  {
    id: 'CONT-2024-002',
    titleKey: 'contracts.contractData.contract2',
    vendorKey: 'contracts.vendors.vendorB',
    amount: '€450,000',
    date: '2024-01-14',
    status: 'suspect',
    riskScore: 87
  },
  {
    id: 'CONT-2024-003',
    titleKey: 'contracts.contractData.contract3',
    vendorKey: 'contracts.vendors.vendorD',
    amount: '€1,200,000',
    date: '2024-01-12',
    status: 'sain',
    riskScore: 15
  },
  {
    id: 'CONT-2024-004',
    titleKey: 'contracts.contractData.contract4',
    vendorKey: 'contracts.vendors.vendorE',
    amount: '€750,000',
    date: '2024-01-10',
    status: 'sain',
    riskScore: 8
  },
  {
    id: 'CONT-2024-005',
    titleKey: 'contracts.contractData.contract5',
    vendorKey: 'contracts.vendors.vendorC',
    amount: '€3,100,000',
    date: '2024-01-08',
    status: 'rejete',
    riskScore: 98
  },
  {
    id: 'CONT-2024-006',
    titleKey: 'contracts.contractData.contract6',
    vendorKey: 'contracts.vendors.supplierCommon',
    amount: '€325,000',
    date: '2024-01-05',
    status: 'suspect',
    riskScore: 78
  }
];

export const mockReportHistory = [
  {
    id: 1,
    titleKey: 'report.reportData.report1',
    submittedDate: '2024-01-01',
    status: 'completed'
  },
  {
    id: 2,
    titleKey: 'report.reportData.report2',
    submittedDate: '2023-12-15',
    status: 'completed'
  }
];
