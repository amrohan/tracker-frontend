import { AggregationType, FieldConfig, FieldType, FilterOperator } from './models';

export const TYPE_ICONS: Record<FieldType, string> = {
  text: 'title', longText: 'notes', number: 'pin', currency: 'payments', date: 'event',
  dateTime: 'schedule', boolean: 'toggle_on', select: 'arrow_drop_down_circle',
  multiSelect: 'checklist', rating: 'star', reference: 'link', multiReference: 'hub', url: 'language',
};

export const TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text', longText: 'Long text', number: 'Number', currency: 'Currency', date: 'Date',
  dateTime: 'Date & time', boolean: 'Yes / No', select: 'Select', multiSelect: 'Multi select',
  rating: 'Rating', reference: 'Reference', multiReference: 'Multi reference', url: 'URL',
};

export const AGG_LABELS: Record<AggregationType, string> = {
  none: 'None', count: 'Count', sum: 'Sum', average: 'Average', min: 'Minimum', max: 'Maximum',
};

export const OP_LABELS: Record<FilterOperator, string> = {
  contains: 'contains', notContains: 'does not contain', equal: 'is', notEqual: 'is not',
  startsWith: 'starts with', greaterThan: 'greater than', greaterThanOrEqual: 'at least',
  lessThan: 'less than', lessThanOrEqual: 'at most', between: 'between', before: 'before',
  after: 'after', isEmpty: 'is empty', isNotEmpty: 'is not empty',
};

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD', 'AED', 'CHF', 'CNY'];

export const EMOJIS = ['📁', '🤝', '🎬', '💸', '📚', '✈️', '🍽️', '🏋️', '🛠️', '🚗', '🎮', '🎵', '🏠', '🐶', '🌱', '☕', '🎁', '📷', '💊', '🧾'];

export function defaultConfig(type: FieldType): FieldConfig {
  switch (type) {
    case 'select':
    case 'multiSelect': return { options: [] };
    case 'currency': return { currency: 'INR' };
    case 'rating': return { max: 5 };
    default: return {};
  }
}
