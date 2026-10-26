import React, { useState } from 'react';
import { Search, CheckCircle2, Clock, HardDrive } from 'lucide-react';
import { trackRecoveryCase } from '../api';
import { RecoveryCase } from '../types';
import {
  Button,
  ProgressBar,
  ErrorState,
  Skeleton,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  toast
} from './ui';

interface RecoveryTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCaseId?: string;
}

export const RecoveryTrackerModal: React.FC<RecoveryTrackerModalProps> = ({
  isOpen,
  onClose,
  initialCaseId
}) => {
  const [caseId, setCaseId] = useState(initialCaseId || 'MN-REC-8291');
  const [loading, setLoading] = useState(false);
  const [caseData, setCaseData] = useState<RecoveryCase | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const executeTracking = async (idToQuery: string) => {
    const cleanId = idToQuery.trim().toUpperCase();
    if (!cleanId) {
      toast.error('Please enter a valid Case ID');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await trackRecoveryCase(cleanId);
      setCaseData(data);
      toast.success(`Case ${data.case_id} retrieved successfully`);
    } catch (err: any) {
      const errMsg = err.message || 'Unable to load case record.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      const targetId = initialCaseId || caseId || 'MN-REC-8291';
      if (initialCaseId && initialCaseId !== caseId) {
        setCaseId(initialCaseId);
      }
      if (!caseData || caseData.case_id !== targetId) {
        executeTracking(targetId);
      }
    }
  }, [isOpen, initialCaseId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    executeTracking(caseId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="service-icon-box" style={{ width: '36px', height: '36px', marginBottom: 0 }}>
              <HardDrive size={18} />
            </div>
            <DialogTitle style={{ fontSize: '20px', fontWeight: 800, color: '#fff' }}>
              Data Recovery Case Tracking
            </DialogTitle>
          </div>
          <DialogDescription style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Real-time physical diagnostic tracking for pen drives, memory cards & storage media.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginTop: '12px', marginBottom: '8px' }}>
          <input
            type="text"
            className="form-input"
            style={{ flex: 1 }}
            placeholder="Enter Case ID (e.g. MN-REC-8291)"
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            aria-label="Case ID"
          />
          <Button type="submit" variant="primary" size="md" isLoading={loading} leftIcon={<Search size={16} />}>
            Track
          </Button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Sample records:</span>
          {['MN-REC-8291', 'MN-REC-1042'].map((sampleId) => (
            <button
              key={sampleId}
              type="button"
              onClick={() => {
                setCaseId(sampleId);
                executeTracking(sampleId);
              }}
              style={{
                background: 'rgba(168, 85, 247, 0.12)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                color: 'var(--purple-glow)',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {sampleId}
            </button>
          ))}
        </div>

        {error && (
          <ErrorState
            title="Tracking Error"
            message={error}
            onRetry={() => handleSearch({ preventDefault: () => {} } as any)}
            style={{ marginBottom: '16px' }}
          />
        )}

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
            <Skeleton height="30px" width="60%" />
            <Skeleton height="16px" width="90%" />
            <Skeleton height="40px" width="100%" />
          </div>
        )}

        {!loading && caseData && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="overview">Diagnostic Overview</TabsTrigger>
              <TabsTrigger value="timeline">Audit & Lab Log ({caseData.timeline ? caseData.timeline.length : 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-muted)', borderRadius: '14px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cyan-accent)' }}>CASE #{caseData.case_id}</span>
                  <Badge variant="purple">
                    {caseData.stage_title || caseData.current_stage.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>{caseData.device_type}</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 12px' }}>
                  Issue Reported: {caseData.issue_type}
                </p>

                <ProgressBar
                  value={caseData.progress_percentage}
                  label="Recovery Progress"
                  showPercentage={true}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-muted)' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>RECOVERED ASSETS</span>
                    <strong style={{ fontSize: '15px', color: '#fff' }}>{caseData.files_recovered_count} files</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>DATA SALVAGED</span>
                    <strong style={{ fontSize: '15px', color: 'var(--cyan-accent)' }}>{(caseData.data_size_recovered_mb / 1024).toFixed(1)} GB</strong>
                  </div>
                </div>

                {caseData.diagnostic_notes && (
                  <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', borderLeft: '2px solid var(--purple-glow)', paddingLeft: '8px' }}>
                    Diagnostics: {caseData.diagnostic_notes}
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="timeline">
              {caseData.timeline && caseData.timeline.length > 0 ? (
                <div style={{ border: '1px solid var(--border-muted)', borderRadius: '12px', overflow: 'hidden' }}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Stage / Event</TableHead>
                        <TableHead>Laboratory Remarks</TableHead>
                        <TableHead style={{ textAlign: 'right' }}>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {caseData.timeline.map((step, idx) => (
                        <TableRow key={idx}>
                          <TableCell style={{ fontWeight: 600, color: '#fff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <CheckCircle2 size={14} style={{ color: 'var(--cyan-accent)', flexShrink: 0 }} />
                              <span>{step.status_title}</span>
                            </div>
                          </TableCell>
                          <TableCell style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                            {step.status_description}
                          </TableCell>
                          <TableCell style={{ textAlign: 'right', color: 'var(--text-dim)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} /> {new Date(step.recorded_at).toLocaleDateString()}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>
                  No lab audit milestones recorded yet.
                </p>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
