/** Services — creator rate card / configurable packages. */
const express = require('express');
const { z } = require('zod');
const { createCrudService } = require('../../services/crudFactory');
const { crudRouter } = require('./_crudRouter');
const { serviceSchema } = require('../../validators/schemas');

const serviceService = createCrudService({
  table: 'services',
  label: 'service',
  fields: ['name', 'category', 'rate', 'rate_type', 'platforms', 'description', 'status',
    'turnaround_days', 'deliverables', 'revisions'],
  searchColumns: ['name', 'category'],
  jsonFields: ['deliverables'],
  softDelete: false,
});

module.exports = crudRouter(serviceService, serviceSchema, {
  buildFilters: (q) => ({ status: q.status, category: q.category }),
});
