import Joi from 'joi';

const passwordPattern = Joi.string()
  .min(8)
  .max(30)
  .regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/)
  .required();

export const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } }) // allow: false is better for browser-side Joi
    .lowercase()
    .trim()
    .required()
    .messages({ 'string.email': 'Please provide a valid email address' }),
  password: Joi.string().required()
});

export const registerSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .trim()
    .required()
    .messages({ 'string.email': 'Please provide a valid email address' }),
  password: passwordPattern.messages({
    'string.pattern.base': 'Password must be at least 8 characters long and contain at least one letter and one number.'
  }),
  confirmPassword: Joi.string()
    .required()
    .valid(Joi.ref('password'))
    .messages({ 'any.only': 'Passwords do not match' })
});