/** Quick notes (sticky notes). */
const express = require('express');
const { createCrudService } = require('../../services/crudFactory');
const { crudRouter } = require('./_crudRouter');
const { noteSchema } = require('../../validators/schemas');

const noteService = createCrudService({
  table: 'quick_notes',
  label: 'note',
  fields: ['title', 'content', 'color', 'is_pinned'],
  searchColumns: ['title', 'content'],
  softDelete: false,
  orderBy: 'is_pinned DESC, created_at DESC',
});

module.exports = crudRouter(noteService, noteSchema);
