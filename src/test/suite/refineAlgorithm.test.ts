import * as assert from 'assert';

interface PatchedModuleLoader {
  _load(request: string, parent: NodeModule | null | undefined, isMain: boolean): unknown;
}

interface MockCall<T extends unknown[] = unknown[]> {
  args: T;
}

interface MockFunction<TArgs extends unknown[] = unknown[], TResult = unknown> {
  (...args: TArgs): TResult;
  calls: Array<MockCall<TArgs>>;
}

function createMockFunction<TArgs extends unknown[] = unknown[], TResult = unknown>(
  implementation?: (...args: TArgs) => TResult
): MockFunction<TArgs, TResult> {
  const calls: Array<MockCall<TArgs>> = [];
  const mock = ((...args: TArgs) => {
    calls.push({ args });
    return implementation ? implementation(...args) : (undefined as TResult);
  }) as MockFunction<TArgs, TResult>;

  mock.calls = calls;
  return mock;
}

function loadMockedRefineAlgorithmModule(
  mocks: Record<string, unknown>
): typeof import('../../commands/refineAlgorithm') {
  const modulePath = require.resolve('../../commands/refineAlgorithm');
  const moduleLoader = require('module') as PatchedModuleLoader;
  const originalLoad = moduleLoader._load;

  delete require.cache[modulePath];

  moduleLoader._load = function patchedLoad(
    request: string,
    parent: NodeModule | null | undefined,
    isMain: boolean
  ) {
    if (request === 'vscode') {
      return mocks.vscode;
    }
    if (request === '../config/settings') {
      return mocks.settings;
    }
    if (request === '../services/fileService') {
      return mocks.fileService;
    }
    if (request === '../services/ollamaService') {
      return mocks.ollamaService;
    }
    if (request === '../utils/promptBuilder') {
      return mocks.promptBuilder;
    }
    if (request === '../utils/logger') {
      return mocks.logger;
    }

    return originalLoad(request, parent, isMain);
  };

  try {
    return require(modulePath) as typeof import('../../commands/refineAlgorithm');
  } finally {
    moduleLoader._load = originalLoad;
  }
}

function makeBaseConfig(overrides: Record<string, unknown> = {}) {
  return {
    destinationDirectory: '',
    programmingLanguage: 'python',
    outputFileBaseName: '',
    ollamaModel: 'codellama',
    ollamaEndpoint: 'http://localhost:11434',
    prompt: 'template',
    refinePrompt: 'Refine {language}: {instruction} :: {codeBody}',
    requestTimeout: 60000,
    showNotifications: false,
    ...overrides,
  };
}

function makeVscodeBase(activeEditor: unknown): any {
  return {
    window: {
      activeTextEditor: activeEditor,
      showInputBox: createMockFunction<[unknown], Promise<string | undefined>>(() =>
        Promise.resolve('add type hints')
      ),
      showWarningMessage: createMockFunction<[string], Promise<void>>(() => Promise.resolve()),
      showInformationMessage: createMockFunction<[string], Promise<void>>(() => Promise.resolve()),
      showErrorMessage: createMockFunction<[string], Promise<void>>(() => Promise.resolve()),
      withProgress: createMockFunction(() => Promise.resolve()),
    },
    workspace: {
      workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
      getWorkspaceFolder: (uri: { fsPath: string }) =>
        uri.fsPath.startsWith('/workspace') ? { uri: { fsPath: '/workspace' } } : undefined,
    },
    Uri: {
      file: (filePath: string) => ({ fsPath: filePath }),
    },
    ProgressLocation: { Notification: 'notification' },
  };
}

suite('refineAlgorithm', () => {
  teardown(() => {
    delete require.cache[require.resolve('../../commands/refineAlgorithm')];
  });

  test('shows warning and returns when no active editor exists', async () => {
    const showWarningMessage = createMockFunction<[string], Promise<void>>(() => Promise.resolve());

    const vscodeMock = makeVscodeBase(undefined);
    vscodeMock.window.showWarningMessage = showWarningMessage;

    const { refineAlgorithm } = loadMockedRefineAlgorithmModule({
      vscode: vscodeMock,
      settings: {
        getConfiguration: () => makeBaseConfig({ showNotifications: true }),
      },
      fileService: {},
      ollamaService: {},
      promptBuilder: {},
      logger: {
        log: createMockFunction(),
        logError: createMockFunction(),
      },
    });

    await refineAlgorithm({} as never);

    assert.strictEqual(showWarningMessage.calls.length, 1);
    assert.ok((showWarningMessage.calls[0].args[0] as string).includes('No active editor found'));
  });

  test('returns early when user cancels the input box', async () => {
    const showInputBox = createMockFunction<[unknown], Promise<string | undefined>>(() =>
      Promise.resolve(undefined)
    );
    const queryOllama = createMockFunction<[string, string, string, number], Promise<string>>(() =>
      Promise.resolve('refined')
    );

    const vscodeMock = makeVscodeBase({
      document: {
        fileName: '/workspace/out/solution_v1.py',
        getText: () => '# add type hints\nprint("hi")',
      },
    });
    vscodeMock.window.showInputBox = showInputBox;

    const { refineAlgorithm } = loadMockedRefineAlgorithmModule({
      vscode: vscodeMock,
      settings: {
        getConfiguration: () => makeBaseConfig(),
      },
      fileService: {},
      ollamaService: { queryOllama },
      promptBuilder: {},
      logger: {
        log: createMockFunction(),
        logError: createMockFunction(),
      },
    });

    await refineAlgorithm({} as never);

    assert.strictEqual(showInputBox.calls.length, 1);
    assert.strictEqual(queryOllama.calls.length, 0);
  });

  test('shows warning when empty prompt is submitted', async () => {
    const showInputBox = createMockFunction<[unknown], Promise<string | undefined>>(() =>
      Promise.resolve('   ')
    );
    const showWarningMessage = createMockFunction<[string], Promise<void>>(() => Promise.resolve());
    const queryOllama = createMockFunction<[string, string, string, number], Promise<string>>(() =>
      Promise.resolve('refined')
    );

    const vscodeMock = makeVscodeBase({
      document: {
        fileName: '/workspace/out/solution_v1.py',
        getText: () => '# add type hints\nprint("hi")',
      },
    });
    vscodeMock.window.showInputBox = showInputBox;
    vscodeMock.window.showWarningMessage = showWarningMessage;

    const { refineAlgorithm } = loadMockedRefineAlgorithmModule({
      vscode: vscodeMock,
      settings: {
        getConfiguration: () => makeBaseConfig({ showNotifications: true }),
      },
      fileService: {},
      ollamaService: { queryOllama },
      promptBuilder: {},
      logger: {
        log: createMockFunction(),
        logError: createMockFunction(),
      },
    });

    await refineAlgorithm({} as never);

    assert.strictEqual(queryOllama.calls.length, 0);
    assert.strictEqual(showWarningMessage.calls.length, 1);
    assert.ok(
      (showWarningMessage.calls[0].args[0] as string).includes('Refinement prompt cannot be empty')
    );
  });

  test('accepts comment-only content and builds a prompt without code body', async () => {
    const showInputBox = createMockFunction<[unknown], Promise<string | undefined>>(() =>
      Promise.resolve('add type hints')
    );
    const queryOllama = createMockFunction<[string, string, string, number], Promise<string>>(() =>
      Promise.resolve('refined code')
    );
    const saveToFile = createMockFunction<[string, string, string], string>(
      () => '/workspace/out/solution_v2.py'
    );
    const generateFilename = createMockFunction<[string, string, { directory: string }], string>(
      () => 'solution_v2.py'
    );
    const buildRefinePrompt = createMockFunction<[string, string, string, string], string>(
      () => 'refine prompt'
    );
    const showInformationMessage = createMockFunction<[string], Promise<void>>(() => Promise.resolve());
    const withProgress = createMockFunction(() => Promise.resolve());
    const log = createMockFunction<[string], void>();
    const logError = createMockFunction<[string, unknown], void>();

    const vscodeMock = makeVscodeBase({
      document: {
        fileName: '/workspace/out/solution_v1.py',
        getText: () => '# add type hints\n# optimize memory',
      },
    });
    vscodeMock.window.showInputBox = showInputBox;
    vscodeMock.window.showInformationMessage = showInformationMessage;
    vscodeMock.window.withProgress = withProgress;

    const { refineAlgorithm } = loadMockedRefineAlgorithmModule({
      vscode: vscodeMock,
      settings: {
        getConfiguration: () => makeBaseConfig(),
      },
      fileService: {
        saveToFile,
        generateFilename,
        resolveDestinationDirectory: () => '/workspace/out',
      },
      ollamaService: { queryOllama },
      promptBuilder: { buildRefinePrompt },
      logger: { log, logError },
    });

    await refineAlgorithm({} as never);

    assert.strictEqual(queryOllama.calls.length, 1);
    assert.strictEqual(buildRefinePrompt.calls.length, 1);
    assert.deepStrictEqual(buildRefinePrompt.calls[0].args, [
      'Refine {language}: {instruction} :: {codeBody}',
      'python',
      'User request:\nadd type hints\n\nFile instruction from top comment:\nadd type hints\noptimize memory',
      '',
    ]);
    assert.strictEqual(generateFilename.calls.length, 1);
    assert.deepStrictEqual(generateFilename.calls[0].args, [
      'solution',
      'python',
      { directory: '/workspace/out' },
    ]);
    assert.strictEqual(saveToFile.calls.length, 1);
    assert.strictEqual(logError.calls.length, 0);
  });

  test('shows progress and saves refined file when notifications are enabled', async () => {
    const progressReports: Array<{ message?: string; increment?: number }> = [];
    const showInputBox = createMockFunction<[unknown], Promise<string | undefined>>(() =>
      Promise.resolve('optimize for memory')
    );
    const showInformationMessage = createMockFunction<[string], Promise<void>>(() => Promise.resolve());
    const withProgress = createMockFunction<
      [
        { location: unknown; title: string; cancellable: boolean },
        (progress: { report(value: { message?: string; increment?: number }): void }) => Promise<void>
      ],
      Promise<void>
    >((_, task) =>
      task({
        report: (value) => {
          progressReports.push(value);
        },
      })
    );
    const queryOllama = createMockFunction<[string, string, string, number], Promise<string>>(() =>
      Promise.resolve('optimized code')
    );
    const saveToFile = createMockFunction<[string, string, string], string>(
      () => '/workspace/out/solution_v2.py'
    );
    const generateFilename = createMockFunction<[string, string, { directory: string }], string>(
      () => 'solution_v2.py'
    );
    const buildRefinePrompt = createMockFunction<[string, string, string, string], string>(
      () => 'refine prompt'
    );
    const log = createMockFunction<[string], void>();
    const logError = createMockFunction<[string, unknown], void>();

    const vscodeMock = makeVscodeBase({
      document: {
        fileName: '/workspace/out/solution_v1.py',
        getText: () => '# add type hints\n\nprint("hi")',
      },
    });
    vscodeMock.window.showInputBox = showInputBox;
    vscodeMock.window.showInformationMessage = showInformationMessage;
    vscodeMock.window.withProgress = withProgress;

    const { refineAlgorithm } = loadMockedRefineAlgorithmModule({
      vscode: vscodeMock,
      settings: {
        getConfiguration: () => makeBaseConfig({ showNotifications: true }),
      },
      fileService: {
        saveToFile,
        generateFilename,
        resolveDestinationDirectory: () => '/workspace/out',
      },
      ollamaService: { queryOllama },
      promptBuilder: { buildRefinePrompt },
      logger: { log, logError },
    });

    await refineAlgorithm({} as never);

    assert.strictEqual(withProgress.calls.length, 1);
    assert.deepStrictEqual(progressReports, [
      { message: 'Reading active editor content...' },
      { message: 'Building prompt...' },
      { message: 'Calling Ollama HTTP API...' },
      { message: 'Writing refined solution file...' },
    ]);
    assert.strictEqual(showInformationMessage.calls.length, 1);
    assert.ok(
      (showInformationMessage.calls[0].args[0] as string).includes('refined solution saved to')
    );
    assert.strictEqual(buildRefinePrompt.calls.length, 1);
    assert.deepStrictEqual(buildRefinePrompt.calls[0].args, [
      'Refine {language}: {instruction} :: {codeBody}',
      'python',
      'User request:\noptimize for memory\n\nFile instruction from top comment:\nadd type hints',
      'print("hi")',
    ]);
    assert.strictEqual(generateFilename.calls.length, 1);
    assert.deepStrictEqual(generateFilename.calls[0].args, [
      'solution',
      'python',
      { directory: '/workspace/out' },
    ]);
    assert.strictEqual(logError.calls.length, 0);
  });

  test('shows error notification when Ollama call fails', async () => {
    const showInputBox = createMockFunction<[unknown], Promise<string | undefined>>(() =>
      Promise.resolve('add tests')
    );
    const showErrorMessage = createMockFunction<[string], Promise<void>>(() => Promise.resolve());
    const withProgress = createMockFunction<
      [
        { location: unknown; title: string; cancellable: boolean },
        (progress: { report(value: { message?: string; increment?: number }): void }) => Promise<void>
      ],
      Promise<void>
    >((_, task) =>
      task({
        report: () => {
          /* noop */
        },
      })
    );
    const queryOllama = createMockFunction<[string, string, string, number], Promise<string>>(() =>
      Promise.reject(new Error('Ollama request failed (HTTP 500): {"error":"internal error"}'))
    );
    const buildRefinePrompt = createMockFunction<[string, string, string, string], string>(
      () => 'refine prompt'
    );
    const log = createMockFunction<[string], void>();
    const logError = createMockFunction<[string, unknown], void>();

    const vscodeMock = makeVscodeBase({
      document: {
        fileName: '/workspace/out/solution_v1.py',
        getText: () => '# add type hints\nprint("hi")',
      },
    });
    vscodeMock.window.showInputBox = showInputBox;
    vscodeMock.window.showErrorMessage = showErrorMessage;
    vscodeMock.window.withProgress = withProgress;

    const { refineAlgorithm } = loadMockedRefineAlgorithmModule({
      vscode: vscodeMock,
      settings: {
        getConfiguration: () => makeBaseConfig({ showNotifications: true }),
      },
      fileService: {
        saveToFile: createMockFunction(() => '/workspace/out/solution_v2.py'),
        generateFilename: () => 'solution_v2.py',
        resolveDestinationDirectory: () => '/workspace/out',
      },
      ollamaService: { queryOllama },
      promptBuilder: { buildRefinePrompt },
      logger: { log, logError },
    });

    await refineAlgorithm({} as never);

    assert.strictEqual(showErrorMessage.calls.length, 1);
    assert.strictEqual(
      showErrorMessage.calls[0].args[0],
      'Algo Solve: Ollama request failed (HTTP 500)'
    );
    assert.strictEqual(logError.calls.length, 1);
  });
});
