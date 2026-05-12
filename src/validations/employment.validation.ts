import Joi from 'joi';

export const employmentInfoSchema = Joi.object({
    // Status must match your UI dropdown exactly
    EmploymentStatus: Joi.string()
        .valid('Salaried', 'Self-Employed', 'Unemployed')
        .required()
        .messages({ 'any.only': 'Please select a valid employment status.' }),

    // Employer Name: Required ONLY if Salaried.
    EmployerName: Joi.string()
        .trim()
        .regex(/^[a-zA-Z\s-]+$/)
        .min(2)
        .max(100)
        .when('EmploymentStatus', {
            is: 'Salaried',
            then: Joi.required(),
            otherwise: Joi.allow('', null).optional(),
        })
        .messages({
            'any.required': 'Employer Name is required for salaried employees.',
            'string.pattern.base': 'Employer Name must only contain letters and spaces.'
        }),

    // Compensation Type: Required if not Unemployed
    CompensationType: Joi.string()
        .valid('Salary', 'Hourly')
        .when('EmploymentStatus', {
            is: Joi.valid('Salaried', 'Self-Employed'),
            then: Joi.required(),
            otherwise: Joi.allow('', null).optional(),
        })
        .messages({ 'any.required': 'Please select a compensation type.' }),

    // Employer Address Fields
    EmployerAddress: Joi.string()
        .trim()
        .when('EmploymentStatus', {
            is: Joi.valid('Salaried', 'Self-Employed'),
            then: Joi.required(),
            otherwise: Joi.allow('', null).optional(),
        })
        .messages({ 'any.required': 'Employer address is required.' }),

    EmployerCity: Joi.string()
        .trim()
        .when('EmploymentStatus', {
            is: Joi.valid('Salaried', 'Self-Employed'),
            then: Joi.required(),
            otherwise: Joi.allow('', null).optional(),
        })
        .messages({ 'any.required': 'Employer city is required.' }),

    EmployerState: Joi.string()
        .trim()
        .when('EmploymentStatus', {
            is: Joi.valid('Salaried', 'Self-Employed'),
            then: Joi.required(),
            otherwise: Joi.allow('', null).optional(),
        })
        .messages({ 'any.required': 'Employer state is required.' }),

    EmployerZipCode: Joi.string()
        .trim()
        .regex(/^[0-9]{5}$/)
        .when('EmploymentStatus', {
            is: Joi.valid('Salaried', 'Self-Employed'),
            then: Joi.required(),
            otherwise: Joi.allow('', null).optional(),
        })
        .messages({
            'any.required': 'Zip code is required.',
            'string.pattern.base': 'Zip code must be 5 digits.'
        }),

    // Years at employer: Optional, can be 0
    YearsAtEmployer: Joi.number()
        .min(0)
        .allow(0, '', null)
        .optional()
        .messages({
            'number.base': 'Years at employer must be a number.',
        }),

    // Monthly income: Optional, can be 0
    MonthlyIncome: Joi.number()
        .min(0)
        .allow(0, '', null)
        .optional()
        .messages({
            'number.base': 'Monthly income must be a valid number.',
        }),

    UserId: Joi.string().required(),
});

export const getEmploymentParamsSchema = Joi.object({
    borrowerId: Joi.string().required()
});