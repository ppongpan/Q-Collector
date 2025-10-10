/**
 * MainFormEditPage - Edit existing form submissions
 *
 * This is a wrapper component that uses FormView to edit existing submissions.
 * FormView already supports loading existing data when submissionId is provided.
 *
 * @version 0.6.3
 * @since 2025-10-02
 */

import React, { forwardRef } from 'react';
import FormView from '../FormView';

const MainFormEditPage = forwardRef(({ formId, submissionId, onSave, onCancel }, ref) => {
  console.log('📝 MainFormEditPage rendered:', { formId, submissionId });

  // FormView already handles:
  // - Loading existing submission data when submissionId is provided
  // - Pre-filling form fields
  // - Validation
  // - File uploads
  // - Conditional visibility
  // - Dual-write to old tables and dynamic tables
  // - Theme support

  return (
    <FormView
      ref={ref}
      formId={formId}
      submissionId={submissionId}
      onSave={onSave}
      onCancel={onCancel}
    />
  );
});

MainFormEditPage.displayName = 'MainFormEditPage';

export default MainFormEditPage;
