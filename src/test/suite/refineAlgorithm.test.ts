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
    if (request === 'fs') {
      return mocks.fs;
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
    ollamaModel: 'codellama',
    ollamaEndpoint: 'http://localhost:11434',
    prompt: 'template',
    refinePrompt: 'Refine {language}: {context} -> {userPrompt}',
    requestTimeout: 60000,
    showNotifications: false,
    ...overrides,
  };
}

suite('refineAlgorithm', () => {
  teardown(() => {
    delete require.cache[require.resolve('../../commands/refineAlgorithm')];
  });

  test('shows warning and returns when no previous solution exists', async () => {
    const showWarningMessage = createMockFunction<[string], Promise<void>>(() => Promise.resolve());
    const showInputBox = createMockFunction<[unknown], Promise<string | undefined>>(() =>
      Promise.resolve('add type hints')
    );

    const context = {
      workspaceState: {
        get: createMockFunction<[string], string | undefined>(() => undefined),
        update: createMockFunction<[string, unknown], Promise<void>>(() => Promise.resolve()),
      },
    };

    const { refineAlgorithm } = loadMockedRefineAlgorithmModule({
      vscode: {
        window: {
          showWarningMessage,
          showInputBox,
          showInformationMessage: createMockFunction(() => Promise.resolve()),
          showErrorMessage: createMockFunction(() => Promise.resolve()),
          withProgress: createMockFunction(() => Promise.resolve()),
        },
        workspace: { workspaceFolders: [] },
        ProgressLocation: { Notification: 'notification' },
      },
      settings: {
        getConfiguration: () => makeBaseConfig({ showNotifications: true }),
        LAST_SAVED_PATH_KEY: 'algoSolve.lastSavedPath',
      },
      fileService: {},
      ollamaService: {},
      promptBuilder: {},
      logger: {
        log: createMockFunction(),
        logError: createMockFunction(),
      },
      fs: {},
    });

    await refineAlgorithm(context as never);

    assert.strictEqual(showWarningMessage.calls.length, 1);
    assert.ok(
      (showWarningMessage.calls[0].args[0] as string).includes('No previous solution found')
    );
    assert.strictEqual(showInputBox.calls.length, 0);
  });

  test('returns early when user cancels the input box', async () => {
    const showInputBox = createMockFunction<[unknown], Promise<string | undefined>>(() =>
      Promise.resolve(undefined)
    );
    const queryOllama = createMockFunction<[string, string, string, number], Promise<string>>(() =>
      Promise.resolve('refined')
    );

    const context = {
      workspaceState: {
        get: createMockFunction<[string], string | undefined>(
          () => '/workspace/out/solution.py'
        ),
        update: createMockFunction<[string, unknown], Promise<void>>(() => Promise.resolve()),
      },
    };

    const { refineAlgorithm } = loadMockedRefineAlgorithmModule({
      vscode: {
        window: {
          showInputBox,
          showWarningMessage: createMockFunction(() => Promise.resolve()),
          showInformationMessage: createMockFunction(() => Promise.resolve()),
          showErrorMessage: createMockFunction(() => Promise.resolve()),
          withProgress: createMockFunction(() => Promise.resolve()),
        },
        workspace: { workspaceFolders: [] },
        ProgressLocation: { Notification: 'notification' },
      },
      settings: {
        getConfiguration: () => makeBaseConfig(),
        LAST_SAVED_PATH_KEY: 'algoSolve.lastSavedPath',
      },
      fileService: {},
      ollamaService: { queryOllama },
      promptBuilder: {},
      logger: {
        log: createMockFunction(),
        logError: createMockFunction(),
      },
      fs: {
        existsSync: createMockFunction(() => true),
        readFileSync: createMockFunction(() => 'existing code'),
      },
    });

    await refineAlgorithm(context as never);

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

    const context = {
      workspaceState: {
        get: createMockFunction<[string], string | undefined>(
          () => '/workspace/out/solution.py'
        ),
        update: createMockFunction<[string, unknown], Promise<void>>(() => Promise.resolve()),
      },
    };

    const { refineAlgorithm } = loadMockedRefineAlgorithmModule({
      vscode: {
        window: {
          showInputBox,
          showWarningMessage,
          showInformationMessage: createMockFunction(() => Promise.resolve()),
          showErrorMessage: createMockFunction(() => Promise.resolve()),
          withProgress: createMockFunction(() => Promise.resolve()),
        },
        workspace: { workspaceFolders: [] },
        ProgressLocation: { Notification: 'notification' },
      },
      settings: {
        getConfiguration: () => makeBaseConfig({ showNotifications: true }),
        LAST_SAVED_PATH_KEY: 'algoSolve.lastSavedPath',
      },
      fileService: {},
      ollamaService: { queryOllama },
      promptBuilder: {},
      logger: {
        log: createMockFunction(),
        logError: createMockFunction(),
      },
      fs: {
        existsSync: createMockFunction(() => true),
        readFileSync: createMockFunction(() => 'existing code'),
      },
    });

    await refineAlgorithm(context as never);

    assert.strictEqual(queryOllama.calls.length, 0);
    assert.strictEqual(showWarningMessage.calls.length, 1);
    assert.ok(
      (showWarningMessage.calls[0].args[0] as string).includes('Refinement prompt cannot be empty')
    );
  });

  test('runs refinement silently when notifications are disabled', async () => {
    const showInputBox = createMockFunction<[unknown], Promise<string | undefined>>(() =>
      Promise.resolve('add type hints')
    );
    const queryOllama = createMockFunction<[string, string, string, number], Promise<string>>(() =>
      Promise.resolve('refined code')
    );
    const saveToFile = createMockFunction<[string, string, string], string>(
      () => '/workspace/out/solution_refined.py'
    );
    const buildRefinePrompt = createMockFunction<[string, string, string, string], string>(
      () => 'refine prompt'
    );
    const showInformationMessage = createMockFunction<[string], Promise<void>>(() => Promise.resolve());
    const withProgress = createMockFunction(() => Promise.resolve());
    const log = createMockFunction<[string], void>();
    const logError = createMockFunction<[string, unknown], void>();

    const context = {
      workspaceState: {
        get: createMockFunction<[string], string | undefined>(
          () => '/workspace/out/solution.py'
        ),
        update: createMockFunction<[string, unknown], Promise<void>>(() => Promise.resolve()),
      },
    };

    const { refineAlgorithm } = loadMockedRefineAlgorithmModule({
      vscode: {
        window: {
          showInputBox,
          showInformationMessage,
          showWarningMessage: createMockFunction(() => Promise.resolve()),
          showErrorMessage: createMockFunction(() => Promise.resolve()),
          withProgress,
        },
        workspace: {
          workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
        },
        ProgressLocation: { Notification: 'notification' },
      },
      settings: {
        getConfiguration: () => makeBaseConfig(),
        LAST_SAVED_PATH_KEY: 'algoSolve.lastSavedPath',
      },
      fileService: {
        saveToFile,
        generateFilename: () => 'solution_refined.py',
      },
      ollamaService: { queryOllama },
      promptBuilder: { buildRefinePrompt },
      logger: { log, logError },
      fs: {
        existsSync: createMockFunction(() => true),
        readFileSync: createMockFunction(() => 'existing code'),
      },
    });

    await refineAlgorithm(context as never);

    assert.strictEqual(withProgress.calls.length, 0);
    assert.strictEqual(showInformationMessage.calls.length, 0);
    assert.strictEqual(queryOllama.calls.length, 1);
    assert.strictEqual(saveToFile.calls.length, 1);
    assert.strictEqual(saveToFile.calls[0].args[0], '/workspace/out');
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
      () => '/workspace/out/solution_refined.py'
    );
    const buildRefinePrompt = createMockFunction<[string, string, string, string], string>(
      () => 'refine prompt'
    );
    const log = createMockFunction<[string], void>();
    const logError = createMockFunction<[string, unknown], void>();

    const context = {
      workspaceState: {
        get: createMockFunction<[string], string | undefined>(
          () => '/workspace/out/solution.py'
        ),
        update: createMockFunction<[string, unknown], Promise<void>>(() => Promise.resolve()),
      },
    };

    const { refineAlgorithm } = loadMockedRefineAlgorithmModule({
      vscode: {
        window: {
          showInputBox,
          showInformationMessage,
          showWarningMessage: createMockFunction(() => Promise.resolve()),
          showErrorMessage: createMockFunction(() => Promise.resolve()),
          withProgress,
        },
        workspace: {
          workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
        },
        ProgressLocation: { Notification: 'notification' },
      },
      settings: {
        getConfiguration: () => makeBaseConfig({ showNotifications: true }),
        LAST_SAVED_PATH_KEY: 'algoSolve.lastSavedPath',
      },
      fileService: {
        saveToFile,
        generateFilename: () => 'solution_refined.py',
      },
      ollamaService: { queryOllama },
      promptBuilder: { buildRefinePrompt },
      logger: { log, logError },
      fs: {
        existsSync: createMockFunction(() => true),
        readFileSync: createMockFunction(() => 'existing code'),
      },
    });

    await refineAlgorithm(context as never);

    assert.strictEqual(withProgress.calls.length, 1);
    assert.deepStrictEqual(progressReports, [
      { message: 'Reading previous solution...' },
      { message: 'Building prompt...' },
      { message: 'Calling Ollama HTTP API...' },
      { message: 'Writing refined solution file...' },
    ]);
    assert.strictEqual(showInformationMessage.calls.length, 1);
    assert.ok(
      (showInformationMessage.calls[0].args[0] as string).includes('refined solution saved to')
    );
    assert.strictEqual(logError.calls.length, 0);
  });

  test('shows error notification when Ollama call fails', async () => {
    const progressReports: Array<{ message?: string; increment?: number }> = [];
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
        report: (value) => {
          progressReports.push(value);
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

    const context = {
      workspaceState: {
        get: createMockFunction<[string], string | undefined>(
          () => '/workspace/out/solution.py'
        ),
        update: createMockFunction<[string, unknown], Promise<void>>(() => Promise.resolve()),
      },
    };

    const { refineAlgorithm } = loadMockedRefineAlgorithmModule({
      vscode: {
        window: {
          showInputBox,
          showErrorMessage,
          showInformationMessage: createMockFunction(() => Promise.resolve()),
          showWarningMessage: createMockFunction(() => Promise.resolve()),
          withProgress,
        },
        workspace: {
          workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
        },
        ProgressLocation: { Notification: 'notification' },
      },
      settings: {
        getConfiguration: () => makeBaseConfig({ showNotifications: true }),
        LAST_SAVED_PATH_KEY: 'algoSolve.lastSavedPath',
      },
      fileService: {
        saveToFile: createMockFunction(() => '/workspace/out/solution_refined.py'),
        generateFilename: () => 'solution_refined.py',
      },
      ollamaService: { queryOllama },
      promptBuilder: { buildRefinePrompt },
      logger: { log, logError },
      fs: {
        existsSync: createMockFunction(() => true),
        readFileSync: createMockFunction(() => 'existing code'),
      },
    });

    await refineAlgorithm(context as never);

    assert.strictEqual(showErrorMessage.calls.length, 1);
    assert.strictEqual(
      showErrorMessage.calls[0].args[0],
      'Algo Solve: Ollama request failed (HTTP 500)'
    );
    assert.strictEqual(logError.calls.length, 1);
  });
});
