'use client';

import { useEffect, useRef } from 'react';
import { useBackendStatus } from '@/hooks/useBackendStatus';
import { useAnalysisWorkspace } from '@/hooks/useAnalysisWorkspace';
import { AnalysisReportHeader } from './AnalysisReportHeader';
import { AppHeader } from './AppHeader';
import { ErrorBanner } from './ErrorBanner';
import { HeatmapViewer } from './HeatmapViewer';
import { HowItWorks } from './HowItWorks';
import { ImageUploader } from './ImageUploader';
import { ProcessingPanel } from './ProcessingPanel';
import { ResultCard } from './ResultCard';
import { SampleImages } from './SampleImages';
import { WorkspaceIntro } from './WorkspaceIntro';

export function AnalysisWorkspace() {
  const backend = useBackendStatus();
  const workspace = useAnalysisWorkspace();
  const reportHeading = useRef<HTMLHeadingElement>(null);
  const activeTarget = workspace.result?.served_by || backend.target;

  useEffect(() => {
    if (workspace.result) reportHeading.current?.focus();
  }, [workspace.result]);

  const resetWorkspace = () => {
    workspace.reset();
    document.getElementById('main-content')?.focus();
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <div className="flex-1">
      <AppHeader
        status={backend.status}
        retryCount={backend.retryCount}
        target={activeTarget}
        onRefresh={backend.checkServer}
      />

      <main id="main-content" tabIndex={-1} className="workspace-shell py-8 sm:py-10">
        {!workspace.result && <WorkspaceIntro />}

        {workspace.result && (
          <AnalysisReportHeader
            filename={workspace.selection?.file.name}
            modelType={workspace.result.model_type}
            headingRef={reportHeading}
            onReset={resetWorkspace}
          />
        )}

        {workspace.error && (
          <div className="mt-7">
            <ErrorBanner message={workspace.error} onDismiss={workspace.clearError} />
          </div>
        )}

        <div className={workspace.result ? '' : 'mt-8'}>
          {!workspace.result ? (
            <div className="space-y-7">
              {workspace.isLoading && <ProcessingPanel />}
              <ImageUploader
                onAnalyze={workspace.analyze}
                isLoading={workspace.isLoading}
                selectedModel={workspace.selectedModel}
                onModelChange={workspace.setSelectedModel}
                selectedFile={workspace.selection?.file ?? null}
                previewUrl={workspace.selection?.url ?? null}
                onFileChange={workspace.selectFile}
              />
              <SampleImages
                onSelectSample={workspace.selectFile}
                isLoading={workspace.isLoading}
                selectedFilename={workspace.selection?.file.name}
              />
              <HowItWorks />
            </div>
          ) : (
            <div className="space-y-8">
              <ResultCard result={workspace.result} />
              <HeatmapViewer result={workspace.result} />
              <HowItWorks />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
