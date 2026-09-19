/** Saved templates (outreach / follow-up / proposal / reminders). */
const express = require('express');
const { z } = require('zod');
const { createCrudService } = require('../../services/crudFactory');
const { crudRouter } = require('./_crudRouter');
const { templateSchema } = require('../../validators/schemas');

const templateService = createCrudService({
  table: 'templates',
  label: 'template',
  fields: ['name', 'category', 'subject', 'body'],
  searchColumns: ['name', 'body'],
  softDelete: true,
});

module.exports = crudRouter(templateService, templateSchema, {
  buildFilters: (q) => ({ category: q.category }),
});
