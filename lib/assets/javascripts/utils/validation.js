import { Tinymce } from './tinymce';
import { isObject, isString, isBoolean } from './isType';
import * as constants from '../constants';
import * as validator from './isValidInputType';

const validatableFields = (ctx) => {
  if (isObject(ctx)) {
    return $(ctx).find('[data-validation], [aria-required="true"]');
  }
  return [];
};
const blockHelp = (id, msg) => {
  if (isString(id) && isString(msg)) {
    return `<span id="${id}" class="help-block" style="display:none;">${msg}</span>`;
  }
  return '';
};
const ariaInvalid = (value) => {
  if (isBoolean(value)) {
    return { 'aria-invalid': value };
  }
  return { 'aria-invalid': false };
};

const validationStates = {
  hasWarning: 'has-warning',
  hasError: 'has-error',
  hasSuccess: 'has-success' };

const getValidationTypeForElement = (el) => {
  const validation = $(el).attr('data-validation');
  // if the specified validation type is defined
  if (validation) {
    return validation;

  // Otherwise if the element is required validate based on its type
  } else if ($(el).attr('aria-required') === 'true') {
    if ($(el).is('input')) {
      return $(el).attr('type'); // available types at https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#Form_<input>_types
    } else if ($(el).is('select')) {
      return 'select';
    } else if ($(el).is('.tinymce')) {
      return 'tinymce';
    } else if ($(el).is('textarea')) {
      return 'textarea';
    }
  }
  return false;
};

const getValue = (type, el) => {
  switch (type) {
    case 'radio':
      return $(el).closest('form').find(`input[name="${$(el).attr('name')}"]:checked`).val();
    case 'select':
      return $(el).find(':selected').val();
    case 'tinymce':
      return Tinymce.findEditorById($(el).attr('id')).getContent();
    case 'checkbox':
      return ($(el).is(':checked') ? 'checked' : '');
    default:
      return $(el).val();
  }
};

const isValid = (type, value) => {
  // TODO add more validation for each new type coming along by:
  // 1. defining a function at dmproadmap.utils.validate
  // 2. adding the case in the switch below

  // See if a specific data-validation was specified
  switch (type) {
    case 'text':
      return validator.isValidText(value);
    case 'textarea':
      return validator.isValidText(value);
    case 'tinymce':
      return validator.isValidText(value);
    case 'number':
      return validator.isValidNumber(value);
    case 'email':
      return validator.isValidEmail(value);
    case 'url':
      return validator.isValidUrl(value);
    case 'password':
      return validator.isValidPassword(value);
    case 'radio':
      return validator.isValidText(value);
    case 'select':
    case 'checkbox':
      return validator.isValidText(value);
    case 'js-combobox':
      return validator.isValidText(value);
    default:
      return false;
  }
};

const getDefaultValidationMessage = (type) => {
  switch (type) {
    case 'text':
      return constants.VALIDATION_MESSAGE_TEXT;
    case 'textarea':
      return constants.VALIDATION_MESSAGE_TEXT;
    case 'number':
      return constants.VALIDATION_MESSAGE_NUMBER;
    case 'email':
      return constants.VALIDATION_MESSAGE_EMAIL;
    case 'url':
      return constants.VALIDATION_MESSAGE_URL;
    case 'password':
      return constants.VALIDATION_MESSAGE_PASSWORD;
    case 'radio':
      return constants.VALIDATION_MESSAGE_RADIO;
    case 'checkbox':
      return constants.VALIDATION_MESSAGE_CHECKBOX;
    case 'js-combobox':
      return constants.VALIDATION_MESSAGE_SELECT;
    default:
      return constants.VALIDATION_MESSAGE_DEFAULT;
  }
};
const getValidationMessage = (el) => {
  if ($(el).attr('data-validation-error')) {
    return $(el).attr('data-validation-error');
  }
  // Use the default validation error message if none was specified
  return getDefaultValidationMessage(getValidationTypeForElement(el));
};
const valid = (el) => {
  $(el).parent().removeClass(validationStates.hasError);
  $(el).attr(ariaInvalid(false));
  $(el).next().hide();
};
const invalid = (el) => {
  $(el).parent().addClass(validationStates.hasError);
  $(el).attr(ariaInvalid(true));
  $(el).next().show();
};
const addValidationMessage = (el) => {
  if (isString($(el).attr('id'))) {
    const id = $(el).attr('id');
    if (!isString($(el).attr('aria-describedby'))) {
      $(el).after(blockHelp(`help-${id}`, getValidationMessage(el)));
      $(el).attr('aria-describedby', `help-${id}`);
      $(el).attr('data-validatable', 'true');
    }
  }
};
const removeValidationMessage = (el) => {
  if (isString($(el).attr('id'))) {
    $(el).parent().find('.help-block').remove();
    $(el).removeAttr('aria-describedby');
    $(el).removeAttr('data-validatable');
  }
};
const isRequired = (ctx) => {
  if (isObject(ctx)) {
    return ($(ctx).attr('aria-required') && $(ctx).attr('aria-required') === 'true');
  }
  return false;
};
const checkValidations = (el) => {
  const type = getValidationTypeForElement(el);
  const value = getValue(type, el);

  // If the field is required or it has a value (runs basic validations against the input type)
  if (isRequired(el) || isString(value)) {
    if (isValid(type, value)) {
      valid(el);
    } else {
      invalid(el);
      return false;
    }
  }
  return true;
};

export const enableValidations = (ctx) => {
  if (isObject(ctx)) {
    if ($(ctx).is('input')) {
      addValidationMessage(ctx);
    } else {
      validatableFields(ctx).each((i, el) => {
        addValidationMessage(el);
      });
    }
  }
};

export const disableValidations = (ctx) => {
  if (isObject(ctx)) {
    if ($(ctx).is('input')) {
      removeValidationMessage(ctx);
    } else {
      validatableFields(ctx).each((i, el) => {
        removeValidationMessage(el);
      });
    }
  }
};

export const validate = (ctx) => {
  let anyInvalid = false;
  if (isObject(ctx)) {
    if ($(ctx).is('input')) {
      anyInvalid = !checkValidations(ctx);
    } else {
      validatableFields(ctx).each((i, el) => {
        if (!checkValidations(el)) {
          anyInvalid = true;
        }
      });
    }
  }
  return !anyInvalid;
};