import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker (must be in the same module per react-pdf v10 docs)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

/**
 * Reusable PDF viewer component built on react-pdf.
 *
 * Accepts `file` prop as:
 *  - `{ data: Uint8Array }` — renders directly (preferred)
 *  - URL string — fetches from main thread and converts to binary
 *
 * @param {Object}  props
 * @param {string | { data: Uint8Array }}  props.file
 * @param {boolean} [props.showLoadingSpinner=true]
 */
export default function PdfViewer({ file, showLoadingSpinner = true }) {
  const [numPages, setNumPages] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfData, setPdfData] = useState(null);
  const [containerWidth, setContainerWidth] = useState(null);
  const containerRef = useRef(null);

  // Resolve file prop to binary data react-pdf can consume
  useEffect(() => {
    if (!file) return;

    if (typeof file === 'string') {
      // URL string — fetch ourselves to avoid PDF.js worker CORS issues
      let cancelled = false;

      const fetchPdf = async () => {
        try {
          const response = await fetch(file);
          if (!response.ok) {
            throw new Error(`Failed to fetch PDF: ${response.status}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          if (!cancelled) {
            setPdfData({ data: new Uint8Array(arrayBuffer) });
          }
        } catch (err) {
          console.error('PDF fetch error:', err);
          if (!cancelled) {
            setLoadError('Failed to load the PDF document.');
            setLoading(false);
          }
        }
      };

      fetchPdf();
      return () => { cancelled = true; };
    } else {
      // Already binary data like { data: Uint8Array }
      setPdfData(file);
    }

    return undefined;
  }, [file]);

  // Measure container width so pages scale responsively
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    const observer = new ResizeObserver(() => {
      // Use requestAnimationFrame to avoid "ResizeObserver loop limit exceeded" errors
      window.requestAnimationFrame(() => {
        if (!node) return;
        // Use clientWidth to prevent horizontal scrollbars (ignores vertical scrollbar width natively)
        const width = node.clientWidth;
        if (width > 0) {
          setContainerWidth(width);
        }
      });
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const onDocumentLoadSuccess = useCallback(({ numPages: pages }) => {
    setNumPages(pages);
    setLoadError(null);
    setLoading(false);
  }, []);

  const onDocumentLoadError = useCallback((error) => {
    console.error('PDF load error:', error);
    setLoadError('Failed to load the PDF document.');
    setLoading(false);
  }, []);

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-3 p-8">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-sm font-medium">{loadError}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="pdf-viewer-container">
      {showLoadingSpinner && loading && (
        <div className="flex w-full h-full flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
          <div className="w-10 h-10 border-4 border-zinc-200 border-t-teal-500 rounded-full animate-spin" />
          <p className="text-sm font-medium text-zinc-500">Rendering document…</p>
        </div>
      )}

      {pdfData && (
        <Document
          file={pdfData}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
        >
          {numPages &&
            Array.from({ length: numPages }, (_, i) => (
              <Page
                key={`page-${i + 1}`}
                pageNumber={i + 1}
                width={containerWidth || undefined}
                loading={null}
                className="pdf-viewer-page"
              />
            ))}
        </Document>
      )}
    </div>
  );
}
