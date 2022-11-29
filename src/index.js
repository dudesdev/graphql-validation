/* eslint-disable func-names */
const validatorJS = require('validator');

const validatorKeys = Object.keys(validatorJS).filter(key => key.startsWith('is'));
validatorKeys.push('contains', 'equals', 'matches');

let errors = {};

function convertToErrorList(error = {}) {
  const keys = Object.keys(error);
  const allErrors = [];
  for (let i = 0; i < keys.length; i++) {
    if (Array.isArray(error[keys[i]])) {
      allErrors.push(...error[keys[i]]);
    } else {
      allErrors.push(error[keys[i]]);
    }
  }
  return allErrors;
}

function validateParams(isOptional = false , param, input) {
  const obj = {
    callbackFuncs: [],
    isNegateNext: false,
    isOptional,
    methods: {
      not() {
        const func = () => {
          obj.isNegateNext = true;
        };

        obj.callbackFuncs.push(func);

        return this;
      },
      exec(args) {
        var current = args;
        for(let i = 0; i < input.length; i++) {
            if(current[input[i]]) {
                current = current[input[i]];
            } else {
                return null;
            }
        }

        const params = current ? current : args;

        obj.callbackFuncs.forEach((func) => {
          func(params);
        });
      },
    },
  };

  validatorKeys.forEach((key) => {
    obj.methods[key] = function (config = {}) {
      const func = (args = { [param]: '' }) => {
        if (obj.isOptional && !args[param]) {
          obj.isNegateNext = false;
          return
        }
        const validationResult = validatorJS[key](`${args[param]}`, config.options);
        const isError = !obj.isNegateNext ? !validationResult : validationResult;

        if (isError) {
          const msg = config.msg || 'Invalid value'
          if (errors[param]) {
            errors[param].push(msg)
          }
          else {
            errors[param] = [msg];
          }
          errors.hasError = true;
        }

        obj.isNegateNext = false;
      };

      obj.callbackFuncs.push(func);
      return obj.methods;
    };
  });
  return obj.methods;
}

module.exports = {
  validator(rules, next) {
    const middleware = (parent, args, context, info) => {
      rules.forEach((func) => {
        func.exec(args);
      });

      if (errors.hasError) {
        const ctx = context;
        delete errors.hasError
        ctx.validationErrors = errors;
        ctx.validationErrorsList = convertToErrorList(errors);
        errors = {};
      }

      return next(parent, args, context, info);
    };

    return middleware;
  },
  validate(param, ...input) {
    return validateParams(false , param, input)
  },
  validateOptional(param, ...input) {
    return validateParams(true , param, input)
  },
};
