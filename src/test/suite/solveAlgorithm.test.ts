import * as assert from 'assert';
import Module = require('module');

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

function loadSolveAlgorithmModule(mocks: Record<string, unknown>): typeof import('../../commands/solveAlgorithm') {
  const modulePath = require.resolve('../../commands/solveAlgorithm');
  const moduleLoader = Module as unknown as PatchedModuleLoader;
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
    return require(modulePath) as typeof import('../../commands/solveAlgorithm');
  } finally {
    moduleLoader._load = originalLoad;
  }
}

suite('solveAlgorithm', () => {
  teardown(() => {
    delete require.cache[require.resolve('../../commands/solveAlgorithm')];
  });

  test('runs silently when notifications are disabled', async () => {
    const showInformationMessage = createMockFunction<[string], Promise<void>>(() => Promise.resolve());
    const showWarningMessage = createMockFunction<[string], Promise<void>>(() => Promise.resolve());
    const showErrorMessage = createMockFunction<[string], Promise<void>>(() => Promise.resolve());
    const withProgress = createMockFunction(() => Promise.resolve());
    const queryOllama = createMockFunction<[string, string, string, number], Promise<string>>(() =>
      Promise.resolve('print("ok")')
    );
    const saveToFile = createMockFunction<[string, string, string], string>(() => '/workspace/out/solution.py');
    const buildPrompt = createMockFunction<[string, string, string], string>(() => 'prompt');
    const log = createMockFunction<[string], void>();
    const logError = createMockFunction<[string, unknown], void>();

    const { solveAlgorithm } = loadSolveAlgorithmModule({
      vscode: {
        window: {
          activeTextEditor: {
            document: {
              fileName: '/workspace/problem.md',
              getText: () => 'two sum',
            },
          },
          showInformationMessage,
          showWarningMessage,
          showErrorMessage,
          withProgress,
          ProgressLocation: undefined,
        },
        workspace: {
          workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
        },
        ProgressLocation: {
          Notification: 'notification',
        },
      },
      settings: {
        getConfiguration: () => ({
          destinationDirectory: '',
          programmingLanguage: 'python',
          ollamaModel: 'codellama',
          ollamaEndpoint: 'http://localhost:11434',
          prompt: 'template',
          requestTimeout: 60000,
          showNotifications: false,
        }),
      },
      fileService: {
        saveToFile,
        generateFilename: () => 'solution.py',
        resolveDestinationDirectory: () => '/workspace/out',
      },
      ollamaService: { queryOllama },
      promptBuilder: { buildPrompt },
      logger: { log, logError },
    });

    await solveAlgorithm();

    assert.strictEqual(withProgress.calls.length, 0);
    assert.strictEqual(showInformationMessage.calls.length, 0);
    assert.strictEqual(showWarningMessage.calls.length, 0);
    assert.strictEqual(showErrorMessage.calls.length, 0);
    assert.strictEqual(queryOllama.calls.length, 1);
    assert.strictEqual(saveToFile.calls.length, 1);
    assert.strictEqual(logError.calls.length, 0);
  });

  test('shows progress and a short error notification when notifications are enabled', async () => {
    const progressReports: Array<{ message?: string; increment?: number }> = [];
    const showInformationMessage = createMockFunction<[string], Promise<void>>(() => Promise.resolve());
    const showWarningMessage = createMockFunction<[string], Promise<void>>(() => Promise.resolve());
    const showErrorMessage = createMockFunction<[string], Promise<void>>(() => Promise.resolve());
    const withProgress = createMockFunction<
      [
        { location: unknown; title: string; cancellable: boolean },
        (progress: { report(value: { message?: string; increment?: number }): void }) => Promise<void>
      ],
      Promise<void>
    >((options, task) => {
      assert.deepStrictEqual(options, {
        location: 'notification',
        title: 'Algo Solve: Solving with Ollama...',
        cancellable: false,
      });

      return task({
        report: (value) => {
          progressReports.push(value);
        },
      });
    });
    const queryOllama = createMockFunction<[string, string, string, number], Promise<string>>(() =>
      Promise.reject(new Error('Ollama request failed (HTTP 404): {"error":"model not found"}'))
    );
    const saveToFile = createMockFunction<[string, string, string], string>(() => '/workspace/out/solution.py');
    const buildPrompt = createMockFunction<[string, string, string], string>(() => 'prompt');
    const log = createMockFunction<[string], void>();
    const logError = createMockFunction<[string, unknown], void>();

    const { solveAlgorithm } = loadSolveAlgorithmModule({
      vscode: {
        window: {
          activeTextEditor: {
            document: {
              fileName: '/workspace/problem.md',
              getText: () => 'two sum',
            },
          },
          showInformationMessage,
          showWarningMessage,
          showErrorMessage,
          withProgress,
        },
        workspace: {
          workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
        },
        ProgressLocation: {
          Notification: 'notification',
        },
      },
      settings: {
        getConfiguration: () => ({
          destinationDirectory: '',
          programmingLanguage: 'python',
          ollamaModel: 'codellama',
          ollamaEndpoint: 'http://localhost:11434',
          prompt: 'template',
          requestTimeout: 60000,
          showNotifications: true,
        }),
      },
      fileService: {
        saveToFile,
        generateFilename: () => 'solution.py',
        resolveDestinationDirectory: () => '/workspace/out',
      },
      ollamaService: { queryOllama },
      promptBuilder: { buildPrompt },
      logger: { log, logError },
    });

    await solveAlgorithm();

    assert.strictEqual(withProgress.calls.length, 1);
    assert.deepStrictEqual(progressReports, [
      { message: 'Reading active editor content...' },
      { message: 'Building prompt...' },
      { message: 'Calling Ollama HTTP API...' },
    ]);
    assert.strictEqual(showInformationMessage.calls.length, 0);
    assert.strictEqual(showWarningMessage.calls.length, 0);
    assert.strictEqual(showErrorMessage.calls.length, 1);
    assert.strictEqual(
      showErrorMessage.calls[0].args[0],
      'Algo Solve: Ollama request failed (HTTP 404)'
    );
    assert.strictEqual(saveToFile.calls.length, 0);
    assert.strictEqual(logError.calls.length, 1);
  });
});
