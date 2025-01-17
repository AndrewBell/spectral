import { DiagnosticSeverity } from '@stoplight/types';
import { RuleType, Spectral } from '../../../spectral';
import * as ruleset from '../index.json';

// @oclif/test packages requires @types/mocha, therefore we have 2 packages coming up with similar typings
// TS is confused and prefers the mocha ones, so we need to instrument it to pick up the Jest ones
declare var test: jest.It;

describe('valid-example-in-schemas', () => {
  const s = new Spectral();

  s.setRules({
    'valid-example-in-schemas': Object.assign(ruleset.rules['valid-example-in-schemas'], {
      recommended: true,
      type: RuleType[ruleset.rules['valid-example-in-schemas'].type],
    }),
  });

  test('will pass when simple example is valid', async () => {
    const results = await s.run({
      components: {
        schemas: {
          xoxo: {
            type: 'string',
            example: 'doggie',
          },
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  test('will fail when simple example is invalid', async () => {
    const results = await s.run({
      components: {
        schemas: {
          xoxo: {
            type: 'string',
            example: 123,
          },
        },
      },
    });
    expect(results).toEqual([
      expect.objectContaining({
        severity: DiagnosticSeverity.Error,
        code: 'valid-example-in-schemas',
        message: '"xoxo.example" property type should be string',
      }),
    ]);
  });

  test('will pass for valid parents examples which contain invalid child examples', async () => {
    const results = await s.run({
      swagger: '2.0',
      info: {
        version: '1.0.0',
        title: 'Swagger Petstore',
      },
      components: {
        schemas: {
          post: {
            schema: {
              type: 'object',
              example: {
                a: {
                  b: {
                    c: 'foo',
                  },
                },
              },
              properties: {
                a: {
                  type: 'object',
                  example: {
                    b: {
                      c: 'foo',
                    },
                  },
                  properties: {
                    b: {
                      type: 'object',
                      properties: {
                        c: {
                          type: 'string',
                          example: 12345,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    expect(results).toEqual([
      expect.objectContaining({
        code: 'valid-example-in-schemas',
        message: '"c.example" property type should be string',
        path: [
          'components',
          'schemas',
          'post',
          'schema',
          'properties',
          'a',
          'properties',
          'b',
          'properties',
          'c',
          'example',
        ],
        range: expect.any(Object),
        severity: DiagnosticSeverity.Error,
      }),
    ]);
  });

  test('will pass when complex example is used ', async () => {
    const results = await s.run({
      components: {
        schemas: {
          xoxo: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
              },
              width: {
                type: 'integer',
              },
              height: {
                type: 'integer',
              },
            },
            required: ['url'],
            example: {
              url: 'images/38.png',
              width: 100,
              height: 100,
            },
          },
        },
      },
    });

    expect(results).toHaveLength(0);
  });

  test('will fail when complex example is used', async () => {
    const data = {
      components: {
        schemas: {
          xoxo: {
            type: 'number',
            example: 4,
          },
          abc: {
            type: 'object',
            properties: {
              id: {
                type: 'integer',
                format: 'int64',
              },
              name: {
                type: 'string',
              },
              abc: {
                type: 'number',
                example: '5',
              },
            },
            required: ['name'],
            example: {
              name: 'Puma',
              id: 1,
            },
          },
        },
      },
    };

    const results = await s.run(data);

    expect(results).toEqual([
      expect.objectContaining({
        code: 'valid-example-in-schemas',
        message: '"abc.example" property type should be number',
        severity: DiagnosticSeverity.Error,
      }),
    ]);
  });

  test('will error with totally invalid input', async () => {
    const results = await s.run({
      components: {
        schemas: {
          xoxo: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
              },
              width: {
                type: 'integer',
              },
              height: {
                type: 'integer',
              },
            },
            required: ['url'],
            example: {
              url2: 'images/38.png',
              width: 'coffee',
              height: false,
            },
          },
        },
      },
    });

    expect(results).toEqual([
      expect.objectContaining({
        code: 'valid-example-in-schemas',
        message: '"xoxo.example" property should have required property \'url\'',
        severity: DiagnosticSeverity.Error,
      }),
    ]);
  });
});
