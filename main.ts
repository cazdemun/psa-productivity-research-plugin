import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
  mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
  mySetting: 'default'
}

export default class MyPlugin extends Plugin {
  settings: MyPluginSettings;
  private embeddingEnabled = true;

  async onload() {
    await this.loadSettings();

    // This creates an icon in the left ribbon.
    const ribbonIconEl = this.addRibbonIcon('camera', 'Sample Plugin', (evt: MouseEvent) => {
      // Called when the user clicks the icon.
      new Notice('This is a notice!');
    });
    // Perform additional things with the ribbon
    ribbonIconEl.addClass('my-plugin-ribbon-class');

    // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
    const statusBarItemEl = this.addStatusBarItem();
    statusBarItemEl.setText('Status Bar Text');


    this.addCommand({
      id: 'toggle-embedding',
      name: 'Toggle Embedding Notes',
      editorCheckCallback: (checking: boolean, editor: Editor, view: MarkdownView) => {
        if (checking) {
          // This command is applicable to markdown views only
          return view.getViewType() === 'markdown';
        }

        // Get the current document's lines
        const lines = editor.getValue().split('\n');

        // Go through each line
        for (let i = 0; i < lines.length; i++) {
          // Check if the line matches the pattern
          if (lines[i].match(/- \[[x ]\] !?\[\[.*\]\]/)) {
            // Modify the line based on the global toggle state
            lines[i] = lines[i].replace(/- \[([x ])\] (!)?\[\[(.*)\]\]/, (match, checked, exclamation, link) => {
              return `- [${checked}] ${this.embeddingEnabled ? '!' : ''}[[${link}]]`;
            });
          }
        }

        // Update the document with the modified lines
        editor.setValue(lines.join('\n'));

        // Toggle the global state
        this.embeddingEnabled = !this.embeddingEnabled;
      }
    });

    this.addCommand({
      id: 'create-file',
      name: 'Create File',
      editorCheckCallback: (checking: boolean, editor) => {
        const selectedText = editor.getSelection();
        if (selectedText.length === 0) {
          if (!checking) {
            new Notice('No text selected.');
          }
          return false;
        }

        if (!checking) {
          new CreatePageModal(this.app, selectedText).open();
        }

        return true;
      }
    });

    // This adds a simple command that can be triggered anywhere
    this.addCommand({
      id: 'open-sample-modal-simple',
      name: 'Open sample modal (simple)',
      callback: () => {
        new SampleModal(this.app).open();
      }
    });
    // This adds an editor command that can perform some operation on the current editor instance
    this.addCommand({
      id: 'sample-editor-command',
      name: 'Sample editor command',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        console.log(editor.getSelection());
        editor.replaceSelection('Sample Editor Command');
      }
    });
    // This adds a complex command that can check whether the current state of the app allows execution of the command
    this.addCommand({
      id: 'open-sample-modal-complex',
      name: 'Open sample modal (complex)',
      checkCallback: (checking: boolean) => {
        // Conditions to check
        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (markdownView) {
          // If checking is true, we're simply "checking" if the command can be run.
          // If checking is false, then we want to actually perform the operation.
          if (!checking) {
            new SampleModal(this.app).open();
          }

          // This command will only show up in Command Palette when the check function returns true
          return true;
        }
      }
    });

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new SampleSettingTab(this.app, this));

    // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
    // Using this function will automatically remove the event listener when this plugin is disabled.
    this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
      console.log('click', evt);
    });

    // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
    this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
  }

  onunload() {

  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class SampleModal extends Modal {
  constructor(app: App) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.setText('Woah!');
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

class CreatePageModal extends Modal {
  constructor(app: App, private selectedText: string) {
    super(app);
  }

  private showError(errorMessageEl: HTMLElement, textInput: HTMLInputElement, message: string) {
    errorMessageEl.setText(message);
    errorMessageEl.style.color = 'red';
    errorMessageEl.style.display = 'block';
    textInput.style.borderColor = 'red';
  }

  private clearError(errorMessageEl: HTMLElement, textInput: HTMLInputElement) {
    errorMessageEl.style.display = 'none';
    textInput.style.borderColor = '';
  }


  onOpen() {
    const { contentEl } = this;

    const title = this.selectedText.split('\n')[0];

    const textInput = contentEl.createEl('input', { type: 'text', value: title });
    const errorMessageEl = contentEl.createEl('p', { text: 'Invalid file name.' });
    errorMessageEl.style.display = 'none';

    if (!this.isValidFileName(textInput.value)) {
      this.showError(errorMessageEl, textInput, 'Invalid file name.');
    }

    const selectedTextEl = contentEl.createEl('pre');
    selectedTextEl.setText(this.selectedText);

    textInput.addEventListener('input', () => {
      const fileName = 'Research/' + textInput.value.trim() + '.md';
      if (!this.isValidFileName(textInput.value)) {
        this.showError(errorMessageEl, textInput, 'Invalid file name.');
      } else if (this.app.vault.getAbstractFileByPath(fileName)) {
        this.showError(errorMessageEl, textInput, 'File already exists.');
      } else {
        this.clearError(errorMessageEl, textInput);
      }
    });

    textInput.addEventListener('keydown', (event) => {
      const fileName = 'Research/' + textInput.value.trim() + '.md';
      if (event.key === 'Enter') {
        if (!this.isValidFileName(textInput.value)) {
          this.showError(errorMessageEl, textInput, 'Invalid file name.');
        } else if (this.app.vault.getAbstractFileByPath(fileName)) {
          this.showError(errorMessageEl, textInput, 'File already exists.');
        } else {
          this.app.vault.create(fileName, this.selectedText);
          this.close();
        }
        event.preventDefault();
      }
    });
  }

  isValidFileName(fileName: string) {
    // eslint-disable-next-line no-useless-escape
    const regex = /[\/\\?%*:|"<>]/g;
    return !regex.test(fileName);
  }
}

class SampleSettingTab extends PluginSettingTab {
  plugin: MyPlugin;

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName('Setting #1')
      .setDesc('It\'s a secret')
      .addText(text => text
        .setPlaceholder('Enter your secret')
        .setValue(this.plugin.settings.mySetting)
        .onChange(async (value) => {
          this.plugin.settings.mySetting = value;
          await this.plugin.saveSettings();
        }));
  }
}
