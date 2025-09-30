/**
 * Q-Collector Export Job Processor
 * Handles data export jobs in background queue
 */

const fs = require('fs').promises;
const path = require('path');
const { Transform } = require('json2csv');
const logger = require('../utils/logger.util');

class ExportProcessor {
  /**
   * Process CSV data export job
   */
  static async processCSVExport(job) {
    const { query, fields, options = {}, outputPath } = job.data;
    const startTime = Date.now();

    try {
      logger.info(`Processing CSV export job ${job.id}`, {
        outputPath,
        fieldsCount: fields?.length,
      });

      await job.progress(10);

      // Get database models
      const db = require('../models');

      await job.progress(20);

      // Execute query to get data
      const data = await this.executeExportQuery(query, db);

      await job.progress(40);

      // Prepare CSV transform options
      const csvOptions = {
        fields: fields || Object.keys(data[0] || {}),
        header: options.includeHeader !== false,
        delimiter: options.delimiter || ',',
        quote: options.quote || '"',
        encoding: options.encoding || 'utf8',
        ...options.csvOptions,
      };

      await job.progress(50);

      // Ensure output directory exists
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      // Create CSV transform stream
      const json2csvTransform = new Transform(csvOptions);

      await job.progress(60);

      // Write CSV file
      await this.writeCSVFile(data, outputPath, json2csvTransform);

      await job.progress(80);

      // Get file stats
      const stats = await fs.stat(outputPath);

      await job.progress(95);

      // Generate metadata
      const metadata = {
        recordCount: data.length,
        fileSize: stats.size,
        filePath: outputPath,
        fields: csvOptions.fields,
        generatedAt: new Date().toISOString(),
        format: 'CSV',
      };

      await job.progress(100);

      const processingTime = Date.now() - startTime;
      logger.info(`CSV export completed for job ${job.id}`, {
        recordCount: metadata.recordCount,
        fileSize: metadata.fileSize,
        processingTime,
      });

      return {
        success: true,
        metadata,
        processingTime,
      };
    } catch (error) {
      logger.error(`CSV export failed for job ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Process JSON data export job
   */
  static async processJSONExport(job) {
    const { query, options = {}, outputPath } = job.data;
    const startTime = Date.now();

    try {
      logger.info(`Processing JSON export job ${job.id}`, {
        outputPath,
      });

      await job.progress(10);

      // Get database models
      const db = require('../models');

      await job.progress(20);

      // Execute query to get data
      const data = await this.executeExportQuery(query, db);

      await job.progress(50);

      // Ensure output directory exists
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      await job.progress(60);

      // Prepare JSON data
      const jsonData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          recordCount: data.length,
          format: 'JSON',
          version: '1.0',
        },
        data: data,
      };

      await job.progress(80);

      // Write JSON file
      const jsonString = JSON.stringify(jsonData, null, options.indent || 2);
      await fs.writeFile(outputPath, jsonString, 'utf8');

      await job.progress(95);

      // Get file stats
      const stats = await fs.stat(outputPath);

      const metadata = {
        recordCount: data.length,
        fileSize: stats.size,
        filePath: outputPath,
        generatedAt: new Date().toISOString(),
        format: 'JSON',
      };

      await job.progress(100);

      const processingTime = Date.now() - startTime;
      logger.info(`JSON export completed for job ${job.id}`, {
        recordCount: metadata.recordCount,
        fileSize: metadata.fileSize,
        processingTime,
      });

      return {
        success: true,
        metadata,
        processingTime,
      };
    } catch (error) {
      logger.error(`JSON export failed for job ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Process Excel data export job
   */
  static async processExcelExport(job) {
    const { query, worksheets, options = {}, outputPath } = job.data;
    const startTime = Date.now();

    try {
      const ExcelJS = require('exceljs');

      logger.info(`Processing Excel export job ${job.id}`, {
        outputPath,
        worksheetCount: worksheets?.length || 1,
      });

      await job.progress(10);

      // Get database models
      const db = require('../models');

      await job.progress(20);

      // Create workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Q-Collector';
      workbook.created = new Date();

      let totalRecords = 0;

      // Process each worksheet
      for (let i = 0; i < (worksheets || [{ name: 'Data', query }]).length; i++) {
        const worksheet = worksheets ? worksheets[i] : { name: 'Data', query };

        // Execute query for this worksheet
        const data = await this.executeExportQuery(worksheet.query, db);
        totalRecords += data.length;

        // Create worksheet
        const ws = workbook.addWorksheet(worksheet.name || `Sheet${i + 1}`);

        // Add headers
        if (data.length > 0) {
          const headers = worksheet.fields || Object.keys(data[0]);
          ws.addRow(headers);

          // Style headers
          const headerRow = ws.getRow(1);
          headerRow.font = { bold: true };
          headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' },
          };

          // Add data rows
          data.forEach(row => {
            const values = headers.map(header => row[header]);
            ws.addRow(values);
          });

          // Auto-fit columns
          ws.columns.forEach(column => {
            column.width = 15;
          });
        }

        const progress = 20 + ((i + 1) / (worksheets?.length || 1)) * 60;
        await job.progress(progress);
      }

      await job.progress(85);

      // Ensure output directory exists
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      // Write Excel file
      await workbook.xlsx.writeFile(outputPath);

      await job.progress(95);

      // Get file stats
      const stats = await fs.stat(outputPath);

      const metadata = {
        recordCount: totalRecords,
        fileSize: stats.size,
        filePath: outputPath,
        worksheetCount: worksheets?.length || 1,
        generatedAt: new Date().toISOString(),
        format: 'Excel',
      };

      await job.progress(100);

      const processingTime = Date.now() - startTime;
      logger.info(`Excel export completed for job ${job.id}`, {
        recordCount: metadata.recordCount,
        fileSize: metadata.fileSize,
        worksheetCount: metadata.worksheetCount,
        processingTime,
      });

      return {
        success: true,
        metadata,
        processingTime,
      };
    } catch (error) {
      logger.error(`Excel export failed for job ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Process form submissions export job
   */
  static async processFormSubmissionsExport(job) {
    const { formId, format, dateRange, options = {} } = job.data;
    const startTime = Date.now();

    try {
      logger.info(`Processing form submissions export job ${job.id}`, {
        formId,
        format,
        dateRange,
      });

      await job.progress(10);

      // Get database models
      const db = require('../models');

      await job.progress(20);

      // Build query for form submissions
      const whereClause = { form_id: formId };

      if (dateRange) {
        whereClause.created_at = {};
        if (dateRange.start) {
          whereClause.created_at[db.Sequelize.Op.gte] = new Date(dateRange.start);
        }
        if (dateRange.end) {
          whereClause.created_at[db.Sequelize.Op.lte] = new Date(dateRange.end);
        }
      }

      await job.progress(30);

      // Get form information
      const form = await db.Form.findByPk(formId, {
        include: [{ model: db.Field, as: 'fields' }],
      });

      if (!form) {
        throw new Error(`Form not found: ${formId}`);
      }

      await job.progress(40);

      // Get submissions with data
      const submissions = await db.Submission.findAll({
        where: whereClause,
        include: [
          {
            model: db.SubmissionData,
            as: 'submissionData',
            include: [{ model: db.Field, as: 'field' }],
          },
        ],
        order: [['created_at', 'DESC']],
      });

      await job.progress(60);

      // Transform submissions data
      const exportData = this.transformSubmissionsForExport(submissions, form.fields);

      await job.progress(70);

      // Generate output filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputDir = path.join(process.cwd(), 'exports', 'submissions');
      const filename = `form_${formId}_submissions_${timestamp}.${format.toLowerCase()}`;
      const outputPath = path.join(outputDir, filename);

      // Process based on format
      let result;
      switch (format.toLowerCase()) {
        case 'csv':
          result = await this.processCSVExport({
            ...job,
            data: {
              query: null, // Data already fetched
              fields: this.getSubmissionExportFields(form.fields),
              outputPath,
              data: exportData,
            },
          });
          break;

        case 'json':
          result = await this.processJSONExport({
            ...job,
            data: {
              query: null,
              outputPath,
              data: exportData,
            },
          });
          break;

        case 'xlsx':
          result = await this.processExcelExport({
            ...job,
            data: {
              query: null,
              worksheets: [{
                name: form.title || 'Submissions',
                data: exportData,
                fields: this.getSubmissionExportFields(form.fields),
              }],
              outputPath,
            },
          });
          break;

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      await job.progress(95);

      // Add form-specific metadata
      result.metadata = {
        ...result.metadata,
        formId,
        formTitle: form.title,
        formVersion: form.version,
        dateRange,
        format,
      };

      await job.progress(100);

      const processingTime = Date.now() - startTime;
      logger.info(`Form submissions export completed for job ${job.id}`, {
        formId,
        submissionCount: exportData.length,
        format,
        processingTime,
      });

      return result;
    } catch (error) {
      logger.error(`Form submissions export failed for job ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Execute export query
   */
  static async executeExportQuery(query, db) {
    if (!query) {
      throw new Error('Export query not provided');
    }

    if (typeof query === 'string') {
      // Raw SQL query
      const [results] = await db.sequelize.query(query);
      return results;
    } else if (typeof query === 'object') {
      // Sequelize query object
      const { model, options } = query;
      const Model = db[model];

      if (!Model) {
        throw new Error(`Model not found: ${model}`);
      }

      return await Model.findAll(options);
    } else {
      throw new Error('Invalid query format');
    }
  }

  /**
   * Write CSV file using transform stream
   */
  static async writeCSVFile(data, outputPath, transform) {
    return new Promise((resolve, reject) => {
      const fs = require('fs');
      const writeStream = fs.createWriteStream(outputPath);

      transform.pipe(writeStream);

      // Write data
      data.forEach(row => transform.write(row));
      transform.end();

      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
      transform.on('error', reject);
    });
  }

  /**
   * Transform submissions for export
   */
  static transformSubmissionsForExport(submissions, fields) {
    return submissions.map(submission => {
      const row = {
        submission_id: submission.id,
        submitted_at: submission.created_at,
        submitted_by: submission.submitted_by_name || 'Anonymous',
        status: submission.status,
      };

      // Add field values
      submission.submissionData.forEach(data => {
        const fieldKey = data.field?.field_key || `field_${data.field_id}`;
        row[fieldKey] = data.value;
      });

      return row;
    });
  }

  /**
   * Get export fields for form submissions
   */
  static getSubmissionExportFields(fields) {
    const baseFields = [
      'submission_id',
      'submitted_at',
      'submitted_by',
      'status',
    ];

    const fieldKeys = fields.map(field => field.field_key);

    return [...baseFields, ...fieldKeys];
  }

  /**
   * Get processor function by job type
   */
  static getProcessor(jobType) {
    const processors = {
      'csv': this.processCSVExport,
      'json': this.processJSONExport,
      'excel': this.processExcelExport,
      'form-submissions': this.processFormSubmissionsExport,
    };

    return processors[jobType];
  }
}

module.exports = ExportProcessor;