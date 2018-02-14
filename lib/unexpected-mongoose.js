const {
  Model,
  Schema,
  Types: { ObjectId, Document, Embedded },
  Error: { ValidationError, ValidatorError }
} = require('mongoose');

module.exports = {
  name: 'unexpected-mongoose',
  installInto: expect => {
    expect.prefferedOutputWidth = 80;

    expect.addType({
      name: 'ObjectId',
      identify(val) {
        return val instanceof ObjectId;
      },
      equal(a, b) {
        return a.equals(b);
      },
      inspect(value, depth, output, inspect) {
        return output
          .jsFunctionName('ObjectId')
          .text('(')
          .append(inspect(value.toString()))
          .text(')');
      }
    });

    expect.addType({
      name: 'Model',
      identify(val) {
        return val instanceof Model;
      },
      equal(a, b, equal) {
        return (
          a.constructor.modelName === b.constructor.modelName &&
          equal(a.toObject(), b.toObject())
        );
      },
      inspectModel(model, output, inspect, truncate) {
        output.jsFunctionName(model.constructor.modelName).text('(');

        if (truncate) {
          output.text('{ /* truncated */ }');
        } else {
          output.append(inspect(model.toObject()));
        }

        return output.text(')');
      },
      inspect(value, depth, output, inspect) {
        return this.inspectModel(value, output, inspect);
      },
      diff(actual, expected, output, diff, inspect) {
        if (actual.constructor.modelName !== expected.constructor.modelName) {
          return this.inspectModel(actual, output, inspect, true)
            .space()
            .annotationBlock(function() {
              this.error('should be a')
                .space()
                .jsFunctionName(expected.constructor.modelName);
            });
        }

        return output
          .jsFunctionName(actual.constructor.modelName)
          .text('(')
          .append(diff(actual.toObject(), expected.toObject()))
          .text(')');
      }
    });

    expect.addType({
      name: 'ModelArray',
      base: 'array',
      identify(value) {
        return (
          value &&
          Array.isArray(value) &&
          value.every(item => item instanceof Model)
        );
      }
    });

    expect.addType({
      name: 'Schema',
      base: 'object',
      identify(val) {
        return val instanceof Schema;
      },
      equal(a, b, equal) {
        return (
          a.constructor.modelName === b.constructor.modelName &&
          equal(a.toObject(), b.toObject())
        );
      },
      inspect(value, depth, output, inspect) {
        output.jsFunctionName('Schema').text('(');
        output.append(inspect(value.paths));
        return output.text(')');
      }
      // TODO: add diffing
    });

    const formatValidationError = ({ message, errors }) => ({
      message,
      errors
    });

    expect.addType({
      name: 'ValidationError',
      identify(val) {
        return val instanceof ValidationError;
      },
      equal(a, b, equal) {
        return equal(formatValidationError(a), formatValidationError(b));
      },
      inspect(value, depth, output, inspect) {
        return output
          .jsFunctionName('ValidationError')
          .text('(')
          .append(inspect(formatValidationError(value)))
          .text(')');
      },
      diff(actual, expected, output, diff) {
        return output
          .jsFunctionName('ValidationError')
          .text('(')
          .append(
            diff(formatValidationError(actual), formatValidationError(expected))
          )
          .text(')');
      }
    });

    const formatValidatorError = ({ message }) => ({ message });

    expect.addType({
      name: 'ValidatorError',
      base: 'Error',
      identify(val) {
        return val instanceof ValidatorError;
      },
      inspect(value, depth, output, inspect) {
        return output
          .jsFunctionName('ValidatorError')
          .text('(')
          .append(inspect(formatValidatorError(value)))
          .text(')');
      },
      diff(actual, expected, output, diff) {
        return output
          .jsFunctionName('ValidatorError')
          .text('(')
          .append(
            diff(formatValidatorError(actual), formatValidatorError(expected))
          )
          .text(')');
      }
    });

    expect.addType({
      name: 'Document',
      identify(val) {
        return val instanceof Document;
      },
      equal(a, b, equal) {
        return equal(a.toObject(), b.toObject());
      },
      getFunctionName(value) {
        return value instanceof Embedded ? 'EmbeddedDocument' : 'Document';
      },
      inspectDocument(value, output, inspect) {
        return output
          .jsFunctionName(this.getFunctionName(value))
          .text('(')
          .append(inspect(value.toObject()))
          .text(')');
      },
      inspect(value, depth, output, inspect) {
        return this.inspectDocument(value, output, inspect);
      },
      diff(actual, expected, output, diff, inspect) {
        const actualFunctionName = this.getFunctionName(actual);
        const expectedFunctionName = this.getFunctionName(expected);

        if (actualFunctionName !== expectedFunctionName) {
          return this.inspectDocument(actual, output, inspect)
            .space()
            .annotationBlock(function() {
              this.error('should be a')
                .space()
                .jsFunctionName(expectedFunctionName);
            });
        }

        return output
          .jsFunctionName(actualFunctionName)
          .text('(')
          .append(diff(actual.toObject(), expected.toObject()))
          .text(')');
      }
    });

    expect.addAssertion(
      '<ObjectId> to equal <string>',
      (expect, subject, value) => {
        return expect(subject, 'to equal', ObjectId(value));
      }
    );

    expect.addAssertion(
      '<string> to equal <ObjectId>',
      (expect, subject, value) => {
        return expect(ObjectId(subject), 'to equal', value);
      }
    );

    expect.addAssertion(
      '<Model|Document> to [exhaustively] satisfy <object>',
      (expect, subject, value) => {
        return expect(subject.toObject(), 'to [exhaustively] satisfy', value);
      }
    );

    expect.addAssertion(
      '<ValidationError> to [exhaustively] satisfy <object>',
      (expect, subject, value) => {
        return expect(subject.toJSON(), 'to [exhaustively] satisfy', value);
      }
    );

    expect.addAssertion(
      '<ValidatorError> to [exhaustively] satisfy <object>',
      (expect, subject, value) => {
        return expect(
          formatValidatorError(subject),
          'to [exhaustively] satisfy',
          value
        );
      }
    );

    // TODO: use ModelArray instead of array
    expect.addAssertion(
      '<array> when sorted by id to [exhaustively] satisfy <array>',
      (expect, subject, value) => {
        const sortById = (a, b) => {
          a = a._id.toString();
          b = b._id.toString();
          if (a > b) {
            return 1;
          }
          if (b > a) {
            return -1;
          }
          return 0;
        };

        subject = subject.slice().sort(sortById);
        value = value.slice().sort(sortById);

        return expect(subject, 'to [exhaustively] satisfy', value);
      }
    );

    // TODO: use ModelArray instead of array
    expect.addAssertion(
      '<Model|array> [when] refreshed <assertion?>',
      (expect, subject) => {
        expect.errorMode = 'bubble';

        const subjectIsArray = Array.isArray(subject);
        const models = subjectIsArray ? subject : [subject];

        return expect.promise
          .all(
            models.map(model => {
              return expect.promise(() => {
                return model.constructor.findById(model.id).exec();
              });
            })
          )
          .then(models => {
            return expect.shift(subjectIsArray ? models : models[0]);
          });
      }
    );

    expect.addAssertion(
      '<ModelArray> to [exhaustively] satisfy <ModelArray>',
      (expect, subject, value) => {
        return expect.promise
          .all(
            subject.map(model => {
              return expect.promise(() => {
                return model.constructor.findById(model.id).exec();
              });
            })
          )
          .then(models => {
            // eslint-disable-next-line no-console
            console.log(`infinite loop for ${models.length} models`);
            return expect(models, 'to [exhaustively] satisfy', value);
          });
      }
    );
  }
};
