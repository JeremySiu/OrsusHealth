import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AssessmentReportTemplate from '../components/assessment-report-template';

export function buildAssessmentReportHtml({ result, formData }) {
  const generatedAt = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const body = renderToStaticMarkup(
    <AssessmentReportTemplate result={result} formData={formData} generatedAt={generatedAt} />
  );

  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    '<title>Cardiovascular Health Assessment</title>',
    '<style>',
    'html, body { margin: 0; padding: 0; background: #ffffff; }',
    'body { width: 816px; }',
    '*, *::before, *::after { box-sizing: border-box; }',
    'a { color: inherit; }',
    '</style>',
    '</head>',
    `<body>${body}</body>`,
    '</html>',
  ].join('');
}
