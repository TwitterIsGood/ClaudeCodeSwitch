import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize } from "@tauri-apps/api/dpi";
import "@material/web/button/filled-button.js";
import "@material/web/button/outlined-button.js";
import "@material/web/button/text-button.js";
import "@material/web/textfield/outlined-text-field.js";
import "@material/web/select/outlined-select.js";
import "@material/web/select/select-option.js";
import "@material/web/icon/icon.js";
import "@material/web/iconbutton/icon-button.js";
import "@material/web/chips/filter-chip.js";
import "@material/web/dialog/dialog.js";

import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "material-symbols/outlined.css";

import "./App.css";

// ===================== Types =====================
type Lang = 'zh' | 'en';
type ThemeColor = 'blue' | 'green' | 'purple' | 'red' | 'teal';
type ThemeMode = 'light' | 'dark';
type PageId = 'providers' | 'settings';

// ===================== i18n Translations =====================
const translations: Record<Lang, Record<string, string>> = {
  zh: {
    appTitle: 'Claude Code 模型环境面板',
    selectFile: '选择 settings.json',
    filePlaceholder: '请选择您的 settings.json 文件...',
    currentActive: '当前生效',
    add: '新增',
    delete: '删除',
    activeProviderInfo: '目前生效的环境来源于服务商：',
    activeProviderNote: '。在这里修改模型会同步更新该服务商的默认配置。Token 和 BaseURL 已设为只读。',
    switchProviderConfirm: '是否切换到服务商【{provider}】进行编辑？',
    switchProviderTitle: '切换服务商',
    modelList: '支持的模型列表',
    modelInputPlaceholder: '输入模型名称，按回车或点击添加...',
    addModel: '添加',
    selectPlaceholder: '-- 请选择 --',
    modelNotInList: '(当前不在该服务商的模型列表中)',
    applyToEnv: '应用此配置到环境',
    saving: '保存中...',
    save: '保存',
    cancel: '取消',
    confirm: '确认',
    promptPlaceholder: '例如: 阿里、百度',
    defaultPathFound: '检测到默认的 Claude Code 配置文件：\n{path}\n\n是否直接使用该文件？',
    defaultPathTitle: '发现默认配置',
    readFileFailed: '读取文件失败: ',
    parseFileFailed: '解析配置文件失败: ',
    newProviderPrompt: '请输入新云服务商名称:',
    applyConfirm: '此操作将会把您的所有修改内容【保存到文件】，并将【{provider}】的配置应用到环境变量中（会在新终端生效）。\n\n确认要继续吗？',
    applyTitle: '保存并应用配置',
    applySuccess: '已成功应用并保存配置！',
    saveFileFailed: '保存文件失败: ',
    deleteConfirm: '确定要彻底删除【{provider}】吗？',
    deleteTitle: '删除服务商',
    saveSuccess: '数据已保存到文件！',
    tokenReadonly: '当前处于「生效环境」视图，无法直接修改 Token。\n\n是否切换到服务商【{provider}】进行编辑？',
    urlReadonly: '当前处于「生效环境」视图，无法直接修改 Base URL。\n\n是否切换到服务商【{provider}】进行编辑？',
    hint: '提示',
    navProviders: '服务商',
    navSettings: '设置',
    settingsTitle: '设置',
    language: '语言',
    themeColor: '主题色',
    appearance: '外观模式',
    lightMode: '亮色',
    darkMode: '暗色',
    opusPlaceholder: '默认: claude-3-opus-20240229',
    sonnetPlaceholder: '默认: claude-3-5-sonnet-20240620',
    haikuPlaceholder: '默认: claude-3-haiku-20240307',
    welcomeTitle: '欢迎使用 Claude Code 配置面板',
    welcomeSubtitle: '开始配置您的第一个服务商',
    welcomeDescription: '选择一个预设模板快速开始，或创建自定义服务商配置。',
    presetAnthropic: 'Anthropic 官方',
    presetOpenRouter: 'OpenRouter',
    presetAzure: 'Azure OpenAI',
    presetBedrock: 'AWS Bedrock',
    presetCustom: '自定义服务商',
    presetAnthropicDesc: '使用 Anthropic 官方 API',
    presetOpenRouterDesc: '通过 OpenRouter 访问多种模型',
    presetAzureDesc: '使用 Azure OpenAI 服务',
    presetBedrockDesc: '使用 AWS Bedrock 服务',
    presetCustomDesc: '完全自定义您的配置',
    enterApiKey: '请输入您的 API Key',
    setupComplete: '设置完成',
    skipSetup: '跳过引导',
    unsavedConfigTitle: '发现未保存的配置',
    unsavedConfigDesc: '检测到您已配置 API Key，但尚未保存为服务商。是否保存以便快速切换？',
    saveAsProvider: '保存为服务商',
    saveAsProviderPrompt: '请输入服务商名称：',
    saveAsProviderSuccess: '已成功保存为服务商：{provider}',
    dismissHint: '知道了',
  },
  en: {
    appTitle: 'Claude Code Model Panel',
    selectFile: 'Select settings.json',
    filePlaceholder: 'Select your settings.json file...',
    currentActive: 'Active',
    add: 'Add',
    delete: 'Delete',
    activeProviderInfo: 'Active environment from provider: ',
    activeProviderNote: '. Model changes here sync to this provider. Token & BaseURL are read-only.',
    switchProviderConfirm: 'Switch to provider [{provider}] for editing?',
    switchProviderTitle: 'Switch Provider',
    modelList: 'Supported Models',
    modelInputPlaceholder: 'Enter model name, press Enter or click Add...',
    addModel: 'Add',
    selectPlaceholder: '-- Select --',
    modelNotInList: '(not in this provider\'s model list)',
    applyToEnv: 'Apply Config to Env',
    saving: 'Saving...',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    promptPlaceholder: 'e.g. Azure, AWS',
    defaultPathFound: 'Default Claude Code config found:\n{path}\n\nUse this file?',
    defaultPathTitle: 'Default Config Found',
    readFileFailed: 'Failed to read file: ',
    parseFileFailed: 'Failed to parse config: ',
    newProviderPrompt: 'Enter new provider name:',
    applyConfirm: 'This will save all changes and apply [{provider}] config to env vars (effective in new terminals).\n\nContinue?',
    applyTitle: 'Save & Apply Config',
    applySuccess: 'Config applied and saved!',
    saveFileFailed: 'Failed to save file: ',
    deleteConfirm: 'Permanently delete [{provider}]?',
    deleteTitle: 'Delete Provider',
    saveSuccess: 'Saved to file!',
    tokenReadonly: 'Active env view — Token is read-only.\n\nSwitch to [{provider}] to edit?',
    urlReadonly: 'Active env view — Base URL is read-only.\n\nSwitch to [{provider}] to edit?',
    hint: 'Notice',
    navProviders: 'Providers',
    navSettings: 'Settings',
    settingsTitle: 'Settings',
    language: 'Language',
    themeColor: 'Theme Color',
    appearance: 'Appearance',
    lightMode: 'Light',
    darkMode: 'Dark',
    opusPlaceholder: 'Default: claude-3-opus-20240229',
    sonnetPlaceholder: 'Default: claude-3-5-sonnet-20240620',
    haikuPlaceholder: 'Default: claude-3-haiku-20240307',
    welcomeTitle: 'Welcome to Claude Code Settings',
    welcomeSubtitle: 'Set up your first provider',
    welcomeDescription: 'Choose a preset template to get started quickly, or create a custom provider configuration.',
    presetAnthropic: 'Anthropic Official',
    presetOpenRouter: 'OpenRouter',
    presetAzure: 'Azure OpenAI',
    presetBedrock: 'AWS Bedrock',
    presetCustom: 'Custom Provider',
    presetAnthropicDesc: 'Use Anthropic official API',
    presetOpenRouterDesc: 'Access multiple models via OpenRouter',
    presetAzureDesc: 'Use Azure OpenAI service',
    presetBedrockDesc: 'Use AWS Bedrock service',
    presetCustomDesc: 'Fully customize your configuration',
    enterApiKey: 'Enter your API Key',
    setupComplete: 'Complete Setup',
    skipSetup: 'Skip Guide',
    unsavedConfigTitle: 'Unsaved Configuration Detected',
    unsavedConfigDesc: 'API Key detected but not saved as a provider. Save it for quick switching?',
    saveAsProvider: 'Save as Provider',
    saveAsProviderPrompt: 'Enter provider name:',
    saveAsProviderSuccess: 'Successfully saved as provider: {provider}',
    dismissHint: 'Got it',
  },
};

function useTranslation(lang: Lang) {
  return useCallback((key: string, params?: Record<string, string>): string => {
    let str = translations[lang][key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      }
    }
    return str;
  }, [lang]);
}

// ===================== Theme Engine =====================
const COMMON_LIGHT: Record<string, string> = {
  '--md-sys-color-error': '#ba1a1a',
  '--md-sys-color-on-error': '#ffffff',
  '--md-sys-color-error-container': '#ffdad6',
  '--md-sys-color-on-error-container': '#410002',
  '--md-sys-color-background': '#fdfcff',
  '--md-sys-color-on-background': '#1a1c1e',
  '--md-sys-color-surface': '#fdfcff',
  '--md-sys-color-on-surface': '#1a1c1e',
  '--md-sys-color-surface-variant': '#dfe2eb',
  '--md-sys-color-on-surface-variant': '#43474e',
  '--md-sys-color-surface-container-low': '#f6f6f8',
  '--md-sys-color-outline': '#73777f',
};

const COMMON_DARK: Record<string, string> = {
  '--md-sys-color-error': '#ffb4ab',
  '--md-sys-color-on-error': '#690005',
  '--md-sys-color-error-container': '#93000a',
  '--md-sys-color-on-error-container': '#ffdad6',
  '--md-sys-color-background': '#1a1c1e',
  '--md-sys-color-on-background': '#e2e2e6',
  '--md-sys-color-surface': '#1a1c1e',
  '--md-sys-color-on-surface': '#e2e2e6',
  '--md-sys-color-surface-variant': '#43474e',
  '--md-sys-color-on-surface-variant': '#c3c7cf',
  '--md-sys-color-surface-container-low': '#252527',
  '--md-sys-color-outline': '#8d9199',
};

const COLOR_TOKENS: Record<ThemeColor, Record<ThemeMode, Record<string, string>>> = {
  blue: {
    light: {
      '--md-sys-color-primary': '#0061a4',
      '--md-sys-color-on-primary': '#ffffff',
      '--md-sys-color-primary-container': '#d1e4ff',
      '--md-sys-color-on-primary-container': '#001d36',
      '--md-sys-color-secondary': '#535f70',
      '--md-sys-color-on-secondary': '#ffffff',
      '--md-sys-color-secondary-container': '#d7e3f7',
      '--md-sys-color-on-secondary-container': '#101c2b',
      '--md-sys-color-tertiary': '#6b5778',
      '--md-sys-color-on-tertiary': '#ffffff',
      '--md-sys-color-tertiary-container': '#f2daff',
      '--md-sys-color-on-tertiary-container': '#251431',
    },
    dark: {
      '--md-sys-color-primary': '#9ecaff',
      '--md-sys-color-on-primary': '#003258',
      '--md-sys-color-primary-container': '#00497d',
      '--md-sys-color-on-primary-container': '#d1e4ff',
      '--md-sys-color-secondary': '#bbc7db',
      '--md-sys-color-on-secondary': '#253140',
      '--md-sys-color-secondary-container': '#3b4858',
      '--md-sys-color-on-secondary-container': '#d7e3f7',
      '--md-sys-color-tertiary': '#d7bee4',
      '--md-sys-color-on-tertiary': '#3b2948',
      '--md-sys-color-tertiary-container': '#53405f',
      '--md-sys-color-on-tertiary-container': '#f2daff',
    },
  },
  green: {
    light: {
      '--md-sys-color-primary': '#006e1c',
      '--md-sys-color-on-primary': '#ffffff',
      '--md-sys-color-primary-container': '#95f990',
      '--md-sys-color-on-primary-container': '#002204',
      '--md-sys-color-secondary': '#52634f',
      '--md-sys-color-on-secondary': '#ffffff',
      '--md-sys-color-secondary-container': '#d5e8cf',
      '--md-sys-color-on-secondary-container': '#111f0f',
      '--md-sys-color-tertiary': '#386568',
      '--md-sys-color-on-tertiary': '#ffffff',
      '--md-sys-color-tertiary-container': '#bcebee',
      '--md-sys-color-on-tertiary-container': '#002022',
    },
    dark: {
      '--md-sys-color-primary': '#78dc77',
      '--md-sys-color-on-primary': '#003a09',
      '--md-sys-color-primary-container': '#005313',
      '--md-sys-color-on-primary-container': '#95f990',
      '--md-sys-color-secondary': '#b9ccb4',
      '--md-sys-color-on-secondary': '#253423',
      '--md-sys-color-secondary-container': '#3b4b39',
      '--md-sys-color-on-secondary-container': '#d5e8cf',
      '--md-sys-color-tertiary': '#a0cfd2',
      '--md-sys-color-on-tertiary': '#003739',
      '--md-sys-color-tertiary-container': '#1e4d50',
      '--md-sys-color-on-tertiary-container': '#bcebee',
    },
  },
  purple: {
    light: {
      '--md-sys-color-primary': '#6750a4',
      '--md-sys-color-on-primary': '#ffffff',
      '--md-sys-color-primary-container': '#eaddff',
      '--md-sys-color-on-primary-container': '#21005d',
      '--md-sys-color-secondary': '#625b71',
      '--md-sys-color-on-secondary': '#ffffff',
      '--md-sys-color-secondary-container': '#e8def8',
      '--md-sys-color-on-secondary-container': '#1d192b',
      '--md-sys-color-tertiary': '#7d5260',
      '--md-sys-color-on-tertiary': '#ffffff',
      '--md-sys-color-tertiary-container': '#ffd8e4',
      '--md-sys-color-on-tertiary-container': '#31111d',
    },
    dark: {
      '--md-sys-color-primary': '#cfbcff',
      '--md-sys-color-on-primary': '#381e72',
      '--md-sys-color-primary-container': '#4f378b',
      '--md-sys-color-on-primary-container': '#eaddff',
      '--md-sys-color-secondary': '#ccc2dc',
      '--md-sys-color-on-secondary': '#332d41',
      '--md-sys-color-secondary-container': '#4a4458',
      '--md-sys-color-on-secondary-container': '#e8def8',
      '--md-sys-color-tertiary': '#efb8c8',
      '--md-sys-color-on-tertiary': '#492532',
      '--md-sys-color-tertiary-container': '#633b48',
      '--md-sys-color-on-tertiary-container': '#ffd8e4',
    },
  },
  red: {
    light: {
      '--md-sys-color-primary': '#c00011',
      '--md-sys-color-on-primary': '#ffffff',
      '--md-sys-color-primary-container': '#ffdad5',
      '--md-sys-color-on-primary-container': '#410001',
      '--md-sys-color-secondary': '#775652',
      '--md-sys-color-on-secondary': '#ffffff',
      '--md-sys-color-secondary-container': '#ffdad5',
      '--md-sys-color-on-secondary-container': '#2c1512',
      '--md-sys-color-tertiary': '#715b2e',
      '--md-sys-color-on-tertiary': '#ffffff',
      '--md-sys-color-tertiary-container': '#fddfa6',
      '--md-sys-color-on-tertiary-container': '#261900',
    },
    dark: {
      '--md-sys-color-primary': '#ffb4a9',
      '--md-sys-color-on-primary': '#690003',
      '--md-sys-color-primary-container': '#930006',
      '--md-sys-color-on-primary-container': '#ffdad5',
      '--md-sys-color-secondary': '#e7bdb7',
      '--md-sys-color-on-secondary': '#442926',
      '--md-sys-color-secondary-container': '#5d3f3b',
      '--md-sys-color-on-secondary-container': '#ffdad5',
      '--md-sys-color-tertiary': '#e0c38c',
      '--md-sys-color-on-tertiary': '#3f2e04',
      '--md-sys-color-tertiary-container': '#584419',
      '--md-sys-color-on-tertiary-container': '#fddfa6',
    },
  },
  teal: {
    light: {
      '--md-sys-color-primary': '#006a6a',
      '--md-sys-color-on-primary': '#ffffff',
      '--md-sys-color-primary-container': '#6ff7f6',
      '--md-sys-color-on-primary-container': '#002020',
      '--md-sys-color-secondary': '#4a6363',
      '--md-sys-color-on-secondary': '#ffffff',
      '--md-sys-color-secondary-container': '#cce8e7',
      '--md-sys-color-on-secondary-container': '#051f1f',
      '--md-sys-color-tertiary': '#4b607c',
      '--md-sys-color-on-tertiary': '#ffffff',
      '--md-sys-color-tertiary-container': '#d3e3fd',
      '--md-sys-color-on-tertiary-container': '#041c35',
    },
    dark: {
      '--md-sys-color-primary': '#4ddad6',
      '--md-sys-color-on-primary': '#003737',
      '--md-sys-color-primary-container': '#004f4f',
      '--md-sys-color-on-primary-container': '#6ff7f6',
      '--md-sys-color-secondary': '#b1cccb',
      '--md-sys-color-on-secondary': '#1c3535',
      '--md-sys-color-secondary-container': '#334b4b',
      '--md-sys-color-on-secondary-container': '#cce8e7',
      '--md-sys-color-tertiary': '#b3c8e8',
      '--md-sys-color-on-tertiary': '#1c3150',
      '--md-sys-color-tertiary-container': '#334863',
      '--md-sys-color-on-tertiary-container': '#d3e3fd',
    },
  },
};

const THEME_SWATCH_COLORS: Record<ThemeColor, string> = {
  blue: '#0061a4',
  green: '#006e1c',
  purple: '#6750a4',
  red: '#c00011',
  teal: '#006a6a',
};

function applyTheme(color: ThemeColor, mode: ThemeMode) {
  const common = mode === 'light' ? COMMON_LIGHT : COMMON_DARK;
  const colorTokens = COLOR_TOKENS[color][mode];
  const allTokens = { ...common, ...colorTokens };
  const root = document.documentElement;
  for (const [key, value] of Object.entries(allTokens)) {
    root.style.setProperty(key, value);
  }
}

// ===================== Hooks =====================
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, []);
  return width;
}

async function fitWindow() {
  requestAnimationFrame(async () => {
    try {
      const height = document.documentElement.scrollHeight;
      const clamped = Math.max(400, Math.min(900, height));
      const win = getCurrentWindow();
      const physicalSize = await win.innerSize();
      const factor = await win.scaleFactor();
      const logicalWidth = physicalSize.toLogical(factor).width;
      await win.setSize(new LogicalSize(logicalWidth, clamped));
    } catch (e) {
      console.error("fitWindow error:", e);
    }
  });
}

// ===================== Titlebar Component =====================
function Titlebar() {
  const appWindow = getCurrentWindow();

  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => appWindow.close();

  return (
    <div className="titlebar" data-tauri-drag-region>
      <span className="titlebar-title" data-tauri-drag-region>Claude Code Settings</span>
      <div className="titlebar-controls">
        <div className="titlebar-button" onClick={handleMinimize}>
          <md-icon style={{ fontSize: '16px' }}>remove</md-icon>
        </div>
        <div className="titlebar-button" onClick={handleMaximize}>
          <md-icon style={{ fontSize: '16px' }}>crop_square</md-icon>
        </div>
        <div className="titlebar-button close" onClick={handleClose}>
          <md-icon style={{ fontSize: '16px' }}>close</md-icon>
        </div>
      </div>
    </div>
  );
}

// ===================== Toast Component =====================
type ToastType = 'info' | 'success' | 'error';
interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-message toast-${t.type}`}>
          <md-icon className="toast-icon">
            {t.type === 'success' && 'check_circle'}
            {t.type === 'error' && 'error'}
            {t.type === 'info' && 'info'}
          </md-icon>
          <span className="toast-text">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ===================== Modal Components =====================
function CustomConfirmModal({
  isOpen, title, content, onConfirm, onCancel, isDanger = false, cancelLabel, confirmLabel
}: {
  isOpen: boolean; title: string; content: React.ReactNode;
  onConfirm: () => void; onCancel: () => void; isDanger?: boolean;
  cancelLabel: string; confirmLabel: string;
}) {
  return (
    <md-dialog open={isOpen ? true : undefined} onClosed={(e: any) => { if (e.target.returnValue === 'confirm') onConfirm(); else onCancel(); }}>
      <div slot="headline" style={{ color: isDanger ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-primary)' }}>
        {isDanger && <md-icon style={{ verticalAlign: 'text-bottom', marginRight: '8px' }}>warning</md-icon>}
        {title}
      </div>
      <div slot="content">{content}</div>
      <div slot="actions">
        <md-text-button onClick={onCancel}>{cancelLabel}</md-text-button>
        <md-filled-button onClick={onConfirm} style={isDanger ? { '--md-sys-color-primary': 'var(--md-sys-color-error)' } as React.CSSProperties : {}}>
          {confirmLabel}
        </md-filled-button>
      </div>
    </md-dialog>
  );
}

function CustomPromptModal({
  isOpen, title, onConfirm, onCancel, cancelLabel, confirmLabel, placeholder
}: {
  isOpen: boolean; title: string;
  onConfirm: (val: string) => void; onCancel: () => void;
  cancelLabel: string; confirmLabel: string; placeholder: string;
}) {
  const [val, setVal] = useState("");

  useEffect(() => {
    if (isOpen) setVal("");
  }, [isOpen]);

  return (
    <md-dialog open={isOpen ? true : undefined} onClosed={(e: any) => { if (e.target.returnValue === 'confirm') onConfirm(val); else onCancel(); }}>
      <div slot="headline">{title}</div>
      <div slot="content">
        <md-outlined-text-field
          value={val}
          onInput={(e: any) => setVal(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e: any) => { if (e.key === 'Enter' && val.trim()) onConfirm(val); }}
          style={{ width: '100%', marginTop: '10px' }}
        ></md-outlined-text-field>
      </div>
      <div slot="actions">
        <md-text-button onClick={onCancel}>{cancelLabel}</md-text-button>
        <md-filled-button onClick={() => onConfirm(val)} disabled={!val.trim()}>{confirmLabel}</md-filled-button>
      </div>
    </md-dialog>
  );
}

// ===================== Navigation Components =====================
const NAV_PAGES: { id: PageId; icon: string; labelKey: string }[] = [
  { id: 'providers', icon: 'dns', labelKey: 'navProviders' },
  { id: 'settings', icon: 'settings', labelKey: 'navSettings' },
];

function NavigationRail({ activePage, onPageChange, t }: {
  activePage: PageId; onPageChange: (p: PageId) => void; t: (key: string) => string;
}) {
  return (
    <nav className="nav-rail">
      {NAV_PAGES.map((p) => (
        <div
          key={p.id}
          className={`nav-rail-item ${activePage === p.id ? 'active' : ''}`}
          onClick={() => onPageChange(p.id)}
        >
          <div className="nav-rail-indicator">
            <md-icon>{p.icon}</md-icon>
          </div>
          <span className="nav-rail-label">{t(p.labelKey)}</span>
        </div>
      ))}
    </nav>
  );
}

function BottomNav({ activePage, onPageChange, t }: {
  activePage: PageId; onPageChange: (p: PageId) => void; t: (key: string) => string;
}) {
  return (
    <nav className="bottom-nav">
      {NAV_PAGES.map((p) => (
        <div
          key={p.id}
          className={`bottom-nav-item ${activePage === p.id ? 'active' : ''}`}
          onClick={() => onPageChange(p.id)}
        >
          <div className="bottom-nav-indicator">
            <md-icon>{p.icon}</md-icon>
          </div>
          <span className="bottom-nav-label">{t(p.labelKey)}</span>
        </div>
      ))}
    </nav>
  );
}

// ===================== Welcome Components =====================
function WelcomeCard({
  t,
  presets,
  selectedPreset,
  welcomeApiKey,
  welcomeStep,
  onPresetSelect,
  onApiKeyChange,
  onComplete,
  onSkip,
}: {
  t: (key: string) => string;
  presets: ProviderPreset[];
  selectedPreset: PresetId | null;
  welcomeApiKey: string;
  welcomeStep: 'select' | 'configure';
  onPresetSelect: (id: PresetId) => void;
  onApiKeyChange: (val: string) => void;
  onComplete: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="card welcome-card">
      <div className="welcome-header">
        <md-icon style={{ fontSize: '48px', color: 'var(--md-sys-color-primary)' }}>waving_hand</md-icon>
        <h2>{t('welcomeTitle')}</h2>
        <p className="welcome-subtitle">{t('welcomeSubtitle')}</p>
        <p className="welcome-description">{t('welcomeDescription')}</p>
      </div>

      {welcomeStep === 'select' ? (
        <div className="preset-grid">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className={`preset-card ${selectedPreset === preset.id ? 'selected' : ''}`}
              onClick={() => onPresetSelect(preset.id)}
            >
              <md-icon style={{ fontSize: '32px', color: 'var(--md-sys-color-primary)' }}>{preset.icon}</md-icon>
              <div className="preset-name">{t(preset.nameKey)}</div>
              <div className="preset-desc">{t(preset.descKey)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="welcome-configure">
          <div className="selected-preset-info">
            <md-icon style={{ fontSize: '32px', color: 'var(--md-sys-color-primary)' }}>
              {presets.find(p => p.id === selectedPreset)?.icon}
            </md-icon>
            <span>{t(presets.find(p => p.id === selectedPreset)?.nameKey || '')}</span>
          </div>
          <md-outlined-text-field
            type="password"
            label={t('enterApiKey')}
            value={welcomeApiKey}
            onInput={(e: any) => onApiKeyChange(e.target.value)}
            placeholder="sk-..."
            style={{ width: '100%' }}
          ></md-outlined-text-field>
          <div className="welcome-actions">
            <md-text-button onClick={() => window.location.reload()}>
              <md-icon slot="icon">arrow_back</md-icon>
              {t('cancel')}
            </md-text-button>
            <md-filled-button onClick={onComplete} disabled={!welcomeApiKey.trim()}>
              <md-icon slot="icon">check</md-icon>
              {t('setupComplete')}
            </md-filled-button>
          </div>
        </div>
      )}

      {welcomeStep === 'select' && (
        <div className="welcome-skip">
          <md-text-button onClick={onSkip}>
            {t('skipSetup')}
          </md-text-button>
        </div>
      )}
    </div>
  );
}

function UnsavedConfigBanner({
  t,
  onSaveAsProvider,
  onDismiss,
}: {
  t: (key: string) => string;
  onSaveAsProvider: (name: string) => void;
  onDismiss: () => void;
}) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [providerName, setProviderName] = useState('');

  const handleSave = () => {
    if (providerName.trim()) {
      onSaveAsProvider(providerName.trim());
      setShowPrompt(false);
    }
  };

  return (
    <>
      <div className="unsaved-banner">
        <div className="unsaved-banner-content">
          <md-icon style={{ fontSize: '24px', color: 'var(--md-sys-color-primary)' }}>info</md-icon>
          <div className="unsaved-banner-text">
            <strong>{t('unsavedConfigTitle')}</strong>
            <p>{t('unsavedConfigDesc')}</p>
          </div>
        </div>
        <div className="unsaved-banner-actions">
          <md-outlined-button onClick={() => setShowPrompt(true)}>
            <md-icon slot="icon">save</md-icon>
            {t('saveAsProvider')}
          </md-outlined-button>
          <md-text-button onClick={onDismiss}>
            {t('dismissHint')}
          </md-text-button>
        </div>
      </div>

      {showPrompt && (
        <md-dialog open={true} onClosed={() => setShowPrompt(false)}>
          <div slot="headline">{t('saveAsProviderPrompt')}</div>
          <div slot="content">
            <md-outlined-text-field
              value={providerName}
              onInput={(e: any) => setProviderName(e.target.value)}
              placeholder={t('promptPlaceholder')}
              style={{ width: '100%', marginTop: '10px' }}
            ></md-outlined-text-field>
          </div>
          <div slot="actions">
            <md-text-button onClick={() => setShowPrompt(false)}>{t('cancel')}</md-text-button>
            <md-filled-button onClick={handleSave} disabled={!providerName.trim()}>{t('confirm')}</md-filled-button>
          </div>
        </md-dialog>
      )}
    </>
  );
}

// ===================== Data Types =====================
interface ProviderConfig {
  ANTHROPIC_AUTH_TOKEN: string;
  ANTHROPIC_BASE_URL: string;
  API_TIMEOUT_MS: string;
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: number;
  ANTHROPIC_DEFAULT_HAIKU_MODEL: string;
  ANTHROPIC_DEFAULT_SONNET_MODEL: string;
  ANTHROPIC_DEFAULT_OPUS_MODEL: string;
  SUPPORTED_MODELS: string;
}

interface Settings {
  autoUpdatesChannel?: string;
  env: Record<string, any>;
  tmp: Record<string, string | number>;
  hooks?: Record<string, any>;
}

const DEFAULT_PROVIDER = "默认(Anthropic)";

// ===================== Preset Types =====================
type PresetId = 'anthropic' | 'openrouter' | 'azure' | 'bedrock' | 'custom';

interface ProviderPreset {
  id: PresetId;
  nameKey: string;
  descKey: string;
  icon: string;
  baseUrl: string;
  defaultModels: string[];
}

const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'anthropic',
    nameKey: 'presetAnthropic',
    descKey: 'presetAnthropicDesc',
    icon: 'psychology',
    baseUrl: 'https://api.anthropic.com/',
    defaultModels: ['claude-3-opus-20240229', 'claude-3-5-sonnet-20240620', 'claude-3-haiku-20240307']
  },
  {
    id: 'openrouter',
    nameKey: 'presetOpenRouter',
    descKey: 'presetOpenRouterDesc',
    icon: 'route',
    baseUrl: 'https://openrouter.ai/api/v1/',
    defaultModels: ['anthropic/claude-3-opus', 'anthropic/claude-3.5-sonnet', 'anthropic/claude-3-haiku']
  },
  {
    id: 'azure',
    nameKey: 'presetAzure',
    descKey: 'presetAzureDesc',
    icon: 'cloud',
    baseUrl: '',
    defaultModels: []
  },
  {
    id: 'bedrock',
    nameKey: 'presetBedrock',
    descKey: 'presetBedrockDesc',
    icon: 'dns',
    baseUrl: '',
    defaultModels: []
  },
  {
    id: 'custom',
    nameKey: 'presetCustom',
    descKey: 'presetCustomDesc',
    icon: 'tune',
    baseUrl: '',
    defaultModels: []
  },
];

// ===================== App Component =====================
function App() {
  // Navigation & preferences
  const [activePage, setActivePage] = useState<PageId>('providers');
  const [lang, setLang] = useState<Lang>('zh');
  const [themeColor, setThemeColor] = useState<ThemeColor>('blue');
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');

  // Provider state
  const [filePath, setFilePath] = useState<string>("");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [providers, setProviders] = useState<string[]>([]);
  const [activeProvider, setActiveProvider] = useState<string>("");
  const [currentConfig, setCurrentConfig] = useState<ProviderConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newModelInput, setNewModelInput] = useState("");

  // Welcome flow state
  const [showWelcomeCard, setShowWelcomeCard] = useState(false);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetId | null>(null);
  const [welcomeApiKey, setWelcomeApiKey] = useState('');
  const [welcomeStep, setWelcomeStep] = useState<'select' | 'configure'>('select');

  // Hooks
  const t = useTranslation(lang);
  const windowWidth = useWindowWidth();
  const isWide = windowWidth >= 600;

  // Apply theme on change (useLayoutEffect to prevent flash)
  useLayoutEffect(() => {
    applyTheme(themeColor, themeMode);
  }, [themeColor, themeMode]);

  // ===================== Modal State =====================
  const [confirmModalData, setConfirmModalData] = useState<{
    isOpen: boolean; title: string; content: React.ReactNode;
    isDanger?: boolean; onConfirm: () => void; onCancel: () => void;
  }>({ isOpen: false, title: "", content: "", onConfirm: () => {}, onCancel: () => {} });

  const [promptModalData, setPromptModalData] = useState<{
    isOpen: boolean; title: string;
    onConfirm: (val: string) => void; onCancel: () => void;
  }>({ isOpen: false, title: "", onConfirm: () => {}, onCancel: () => {} });

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (msg: string, type: ToastType = 'info', durationMs = 3000) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message: msg, type }]);
    setTimeout(() => { setToasts(prev => prev.filter(t => t.id !== id)); }, durationMs);
  };

  const asyncConfirm = (messageText: string, titleStr: string, isDanger = false): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmModalData({
        isOpen: true, title: titleStr, content: messageText, isDanger,
        onConfirm: () => { setConfirmModalData(prev => ({ ...prev, isOpen: false })); resolve(true); },
        onCancel: () => { setConfirmModalData(prev => ({ ...prev, isOpen: false })); resolve(false); },
      });
    });
  };

  const asyncPrompt = (titleStr: string): Promise<string | null> => {
    return new Promise((resolve) => {
      setPromptModalData({
        isOpen: true, title: titleStr,
        onConfirm: (val: string) => { setPromptModalData(prev => ({ ...prev, isOpen: false })); resolve(val); },
        onCancel: () => { setPromptModalData(prev => ({ ...prev, isOpen: false })); resolve(null); },
      });
    });
  };

  // ===================== Startup =====================
  useEffect(() => { checkDefaultSettings(); }, []);

  // Fit window on page change
  useEffect(() => { fitWindow(); }, [activePage]);

  async function checkDefaultSettings() {
    try {
      const defaultPath = await invoke<string | null>("get_default_settings_path");
      if (defaultPath) {
        const useIt = await asyncConfirm(
          t('defaultPathFound', { path: defaultPath }),
          t('defaultPathTitle')
        );
        if (useIt) {
          setFilePath(defaultPath);
          await loadSettings(defaultPath);
        }
      }
    } catch (e) {
      console.error("checkDefaultSettings error:", e);
    }
  }

  async function openFile() {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Settings", extensions: ["json"] }],
      });
      if (selected && typeof selected === "string") {
        setFilePath(selected);
        await loadSettings(selected);
      }
    } catch (err) {
      console.error(err);
      showToast(t('readFileFailed') + err, 'error');
    }
  }

  async function loadSettings(path: string) {
    try {
      const content = await invoke<string>("read_settings", { path });
      const parsed = JSON.parse(content) as Settings;

      if (!parsed.env) parsed.env = {};
      if (!parsed.tmp) parsed.tmp = {};

      // Load preferences from tmp
      if (parsed.tmp.APP_LANG) setLang(parsed.tmp.APP_LANG as Lang);
      if (parsed.tmp.APP_THEME_COLOR) setThemeColor(parsed.tmp.APP_THEME_COLOR as ThemeColor);
      if (parsed.tmp.APP_THEME_MODE) setThemeMode(parsed.tmp.APP_THEME_MODE as ThemeMode);

      setSettings(parsed);

      // Extract providers from tmp
      const tmpKeys = Object.keys(parsed.tmp);
      const providerSet = new Set<string>();
      const suffixes = [
        "-ANTHROPIC_AUTH_TOKEN", "-ANTHROPIC_BASE_URL", "-API_TIMEOUT_MS",
        "-CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
        "-ANTHROPIC_DEFAULT_HAIKU_MODEL", "-ANTHROPIC_DEFAULT_SONNET_MODEL", "-ANTHROPIC_DEFAULT_OPUS_MODEL",
        "-SUPPORTED_MODELS"
      ];
      tmpKeys.forEach((key) => {
        for (const suffix of suffixes) {
          if (key.endsWith(suffix)) {
            const name = key.replace(suffix, "");
            // Don't treat APP_ prefixed keys as provider names
            if (!name.startsWith("APP_")) providerSet.add(name);
            break;
          }
        }
      });

      const providerList = Array.from(providerSet);
      setProviders([DEFAULT_PROVIDER, ...providerList]);
      setActiveProvider(DEFAULT_PROVIDER);

      const activeProv = parsed.tmp.CURRENT_ACTIVE_PROVIDER as string;
      const supportedModels = activeProv ? (parsed.tmp[`${activeProv}-SUPPORTED_MODELS`] as string) || "" : "";

      setCurrentConfig({
        ANTHROPIC_AUTH_TOKEN: parsed.env.ANTHROPIC_AUTH_TOKEN || "",
        ANTHROPIC_BASE_URL: parsed.env.ANTHROPIC_BASE_URL || "",
        API_TIMEOUT_MS: parsed.env.API_TIMEOUT_MS?.toString() || "3000000",
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: parsed.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC || 1,
        ANTHROPIC_DEFAULT_HAIKU_MODEL: parsed.env.ANTHROPIC_DEFAULT_HAIKU_MODEL || "",
        ANTHROPIC_DEFAULT_SONNET_MODEL: parsed.env.ANTHROPIC_DEFAULT_SONNET_MODEL || "",
        ANTHROPIC_DEFAULT_OPUS_MODEL: parsed.env.ANTHROPIC_DEFAULT_OPUS_MODEL || "",
        SUPPORTED_MODELS: supportedModels,
      });

      // Check for first-time user or unsaved config (if not skipped)
      const skipWelcome = parsed.tmp.APP_SKIP_WELCOME;
      if (!skipWelcome) {
        if (checkFirstTimeUser(parsed)) {
          setShowWelcomeCard(true);
        } else if (checkUnsavedProviderConfig(parsed)) {
          setShowUnsavedPrompt(true);
        }
      }

      fitWindow();
    } catch (err) {
      console.error(err);
      showToast(t('parseFileFailed') + err, 'error');
    }
  }

  // ===================== Welcome Detection Functions =====================
  function checkFirstTimeUser(settingsData: Settings | null): boolean {
    if (!settingsData) return true;
    const token = settingsData.env?.ANTHROPIC_AUTH_TOKEN;
    return !token || token.trim() === '';
  }

  function checkUnsavedProviderConfig(settingsData: Settings | null): boolean {
    if (!settingsData) return false;
    const hasEnvToken = settingsData.env?.ANTHROPIC_AUTH_TOKEN && settingsData.env.ANTHROPIC_AUTH_TOKEN.trim() !== '';
    const hasActiveProvider = settingsData.tmp?.CURRENT_ACTIVE_PROVIDER;
    const hasAnyProviderConfig = Object.keys(settingsData.tmp || {}).some(
      key => key.endsWith('-ANTHROPIC_AUTH_TOKEN') && !key.startsWith('APP_') && settingsData.tmp && settingsData.tmp[key]
    );
    return !!hasEnvToken && !hasActiveProvider && !hasAnyProviderConfig;
  }

  function loadProviderConfig(provider: string, settingsSource: Settings) {
    if (provider === DEFAULT_PROVIDER) {
      const activeProv = settingsSource.tmp.CURRENT_ACTIVE_PROVIDER as string;
      const supportedModels = activeProv ? (settingsSource.tmp[`${activeProv}-SUPPORTED_MODELS`] as string) || "" : "";
      setCurrentConfig({
        ANTHROPIC_AUTH_TOKEN: settingsSource.env.ANTHROPIC_AUTH_TOKEN || "",
        ANTHROPIC_BASE_URL: settingsSource.env.ANTHROPIC_BASE_URL || "",
        API_TIMEOUT_MS: settingsSource.env.API_TIMEOUT_MS?.toString() || "3000000",
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: settingsSource.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC || 1,
        ANTHROPIC_DEFAULT_HAIKU_MODEL: settingsSource.env.ANTHROPIC_DEFAULT_HAIKU_MODEL || "",
        ANTHROPIC_DEFAULT_SONNET_MODEL: settingsSource.env.ANTHROPIC_DEFAULT_SONNET_MODEL || "",
        ANTHROPIC_DEFAULT_OPUS_MODEL: settingsSource.env.ANTHROPIC_DEFAULT_OPUS_MODEL || "",
        SUPPORTED_MODELS: supportedModels,
      });
      return;
    }

    const { tmp } = settingsSource;
    setCurrentConfig({
      ANTHROPIC_AUTH_TOKEN: (tmp[`${provider}-ANTHROPIC_AUTH_TOKEN`] as string) || "",
      ANTHROPIC_BASE_URL: (tmp[`${provider}-ANTHROPIC_BASE_URL`] as string) || "",
      API_TIMEOUT_MS: tmp[`${provider}-API_TIMEOUT_MS`]?.toString() || "3000000",
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: (tmp[`${provider}-CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`] as number) || 1,
      ANTHROPIC_DEFAULT_HAIKU_MODEL: (tmp[`${provider}-ANTHROPIC_DEFAULT_HAIKU_MODEL`] as string) || "",
      ANTHROPIC_DEFAULT_SONNET_MODEL: (tmp[`${provider}-ANTHROPIC_DEFAULT_SONNET_MODEL`] as string) || "",
      ANTHROPIC_DEFAULT_OPUS_MODEL: (tmp[`${provider}-ANTHROPIC_DEFAULT_OPUS_MODEL`] as string) || "",
      SUPPORTED_MODELS: (tmp[`${provider}-SUPPORTED_MODELS`] as string) || "",
    });
  }

  function getUpdatedSettings(): Settings | null {
    if (!settings || !currentConfig || !activeProvider) return null;
    const newSettings: Settings = { ...settings, env: { ...settings.env }, tmp: { ...settings.tmp } };

    // Persist app preferences
    newSettings.tmp.APP_LANG = lang;
    newSettings.tmp.APP_THEME_COLOR = themeColor;
    newSettings.tmp.APP_THEME_MODE = themeMode;

    if (activeProvider === DEFAULT_PROVIDER) {
      newSettings.env = {
        ...newSettings.env,
        ANTHROPIC_AUTH_TOKEN: currentConfig.ANTHROPIC_AUTH_TOKEN,
        ANTHROPIC_BASE_URL: currentConfig.ANTHROPIC_BASE_URL,
        API_TIMEOUT_MS: currentConfig.API_TIMEOUT_MS,
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: Number(currentConfig.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC),
        ANTHROPIC_DEFAULT_HAIKU_MODEL: currentConfig.ANTHROPIC_DEFAULT_HAIKU_MODEL,
        ANTHROPIC_DEFAULT_SONNET_MODEL: currentConfig.ANTHROPIC_DEFAULT_SONNET_MODEL,
        ANTHROPIC_DEFAULT_OPUS_MODEL: currentConfig.ANTHROPIC_DEFAULT_OPUS_MODEL,
      };
      const activeProv = newSettings.tmp.CURRENT_ACTIVE_PROVIDER as string;
      if (activeProv) {
        newSettings.tmp[`${activeProv}-ANTHROPIC_DEFAULT_HAIKU_MODEL`] = currentConfig.ANTHROPIC_DEFAULT_HAIKU_MODEL;
        newSettings.tmp[`${activeProv}-ANTHROPIC_DEFAULT_SONNET_MODEL`] = currentConfig.ANTHROPIC_DEFAULT_SONNET_MODEL;
        newSettings.tmp[`${activeProv}-ANTHROPIC_DEFAULT_OPUS_MODEL`] = currentConfig.ANTHROPIC_DEFAULT_OPUS_MODEL;
      }
    } else {
      newSettings.tmp[`${activeProvider}-ANTHROPIC_AUTH_TOKEN`] = currentConfig.ANTHROPIC_AUTH_TOKEN;
      newSettings.tmp[`${activeProvider}-ANTHROPIC_BASE_URL`] = currentConfig.ANTHROPIC_BASE_URL;
      newSettings.tmp[`${activeProvider}-API_TIMEOUT_MS`] = currentConfig.API_TIMEOUT_MS;
      newSettings.tmp[`${activeProvider}-CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`] = Number(currentConfig.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC);
      newSettings.tmp[`${activeProvider}-ANTHROPIC_DEFAULT_HAIKU_MODEL`] = currentConfig.ANTHROPIC_DEFAULT_HAIKU_MODEL;
      newSettings.tmp[`${activeProvider}-ANTHROPIC_DEFAULT_SONNET_MODEL`] = currentConfig.ANTHROPIC_DEFAULT_SONNET_MODEL;
      newSettings.tmp[`${activeProvider}-ANTHROPIC_DEFAULT_OPUS_MODEL`] = currentConfig.ANTHROPIC_DEFAULT_OPUS_MODEL;
      newSettings.tmp[`${activeProvider}-SUPPORTED_MODELS`] = currentConfig.SUPPORTED_MODELS || "";
    }
    return newSettings;
  }

  function switchProvider(newProvider: string) {
    if (!settings) return;
    const updatedSettings = getUpdatedSettings() || settings;
    loadProviderConfig(newProvider, updatedSettings);
    setSettings(updatedSettings);
    setActiveProvider(newProvider);
  }

  async function addNewProvider() {
    const name = await asyncPrompt(t('newProviderPrompt'));
    if (!name || name.trim() === "" || providers.includes(name)) return;

    const updatedSettings = getUpdatedSettings() || settings;
    if (updatedSettings) setSettings(updatedSettings);

    setProviders(prev => [...prev, name]);
    setActiveProvider(name);
    setCurrentConfig({
      ANTHROPIC_AUTH_TOKEN: "", ANTHROPIC_BASE_URL: "",
      API_TIMEOUT_MS: "3000000", CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 1,
      ANTHROPIC_DEFAULT_HAIKU_MODEL: "", ANTHROPIC_DEFAULT_SONNET_MODEL: "",
      ANTHROPIC_DEFAULT_OPUS_MODEL: "", SUPPORTED_MODELS: "",
    });
  }

  function handleInputChange(field: keyof ProviderConfig, value: string | number) {
    if (!currentConfig) return;
    setCurrentConfig({ ...currentConfig, [field]: value });
  }

  function handleAddModel() {
    if (!currentConfig || !newModelInput.trim()) return;
    const currentModels = currentConfig.SUPPORTED_MODELS
      ? currentConfig.SUPPORTED_MODELS.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
      : [];
    const modelName = newModelInput.trim();
    if (!currentModels.includes(modelName)) {
      handleInputChange("SUPPORTED_MODELS", [...currentModels, modelName].join(","));
    }
    setNewModelInput("");
  }

  function handleRemoveModel(modelToRemove: string) {
    if (!currentConfig) return;
    const currentModels = currentConfig.SUPPORTED_MODELS
      ? currentConfig.SUPPORTED_MODELS.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
      : [];
    handleInputChange("SUPPORTED_MODELS", currentModels.filter(m => m !== modelToRemove).join(","));
  }

  async function applyAsEnv() {
    if (!settings || !currentConfig || !filePath) return;
    const newSettings = getUpdatedSettings() || { ...settings, env: { ...settings.env }, tmp: { ...settings.tmp } };

    const doApply = await asyncConfirm(
      t('applyConfirm', { provider: activeProvider }),
      t('applyTitle')
    );
    if (!doApply) return;

    try {
      setIsSaving(true);
      newSettings.tmp.CURRENT_ACTIVE_PROVIDER = activeProvider;
      newSettings.env = {
        ...newSettings.env,
        ANTHROPIC_AUTH_TOKEN: currentConfig.ANTHROPIC_AUTH_TOKEN,
        ANTHROPIC_BASE_URL: currentConfig.ANTHROPIC_BASE_URL,
        API_TIMEOUT_MS: currentConfig.API_TIMEOUT_MS,
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: Number(currentConfig.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC),
        ANTHROPIC_DEFAULT_HAIKU_MODEL: currentConfig.ANTHROPIC_DEFAULT_HAIKU_MODEL,
        ANTHROPIC_DEFAULT_SONNET_MODEL: currentConfig.ANTHROPIC_DEFAULT_SONNET_MODEL,
        ANTHROPIC_DEFAULT_OPUS_MODEL: currentConfig.ANTHROPIC_DEFAULT_OPUS_MODEL,
      };
      setSettings(newSettings);
      await invoke("write_settings", { path: filePath, content: JSON.stringify(newSettings, null, 2) });
      showToast(t('applySuccess'), 'success');
      loadProviderConfig(DEFAULT_PROVIDER, newSettings);
      setActiveProvider(DEFAULT_PROVIDER);
    } catch (err) {
      console.error(err);
      showToast(t('saveFileFailed') + err, 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteProvider() {
    if (!settings || activeProvider === DEFAULT_PROVIDER) return;
    const del = await asyncConfirm(
      t('deleteConfirm', { provider: activeProvider }),
      t('deleteTitle'),
      true
    );
    if (!del) return;

    const newSettings = { ...settings, tmp: { ...settings.tmp } };
    Object.keys(newSettings.tmp).filter(k => k.startsWith(`${activeProvider}-`)).forEach(k => { delete newSettings.tmp[k]; });
    if (newSettings.tmp.CURRENT_ACTIVE_PROVIDER === activeProvider) delete newSettings.tmp.CURRENT_ACTIVE_PROVIDER;

    setSettings(newSettings);
    setProviders(providers.filter(p => p !== activeProvider));
    loadProviderConfig(DEFAULT_PROVIDER, newSettings);
    setActiveProvider(DEFAULT_PROVIDER);
  }

  async function saveToFile() {
    if (!settings || !filePath) return;
    const newSettings = getUpdatedSettings();
    if (!newSettings) return;
    setSettings(newSettings);
    try {
      setIsSaving(true);
      await invoke("write_settings", { path: filePath, content: JSON.stringify(newSettings, null, 2) });
      showToast(t('saveSuccess'), 'success');
    } catch (err) {
      console.error(err);
      showToast(t('saveFileFailed') + err, 'error');
    } finally {
      setIsSaving(false);
    }
  }

  // Save preferences immediately
  async function savePreferences(newLang: Lang, newColor: ThemeColor, newMode: ThemeMode) {
    if (!settings || !filePath) return;
    const newSettings = { ...settings, tmp: { ...settings.tmp } };
    newSettings.tmp.APP_LANG = newLang;
    newSettings.tmp.APP_THEME_COLOR = newColor;
    newSettings.tmp.APP_THEME_MODE = newMode;
    setSettings(newSettings);
    try {
      await invoke("write_settings", { path: filePath, content: JSON.stringify(newSettings, null, 2) });
    } catch (err) {
      console.error("savePreferences error:", err);
    }
  }

  const handleLangChange = (newLang: Lang) => {
    setLang(newLang);
    savePreferences(newLang, themeColor, themeMode);
  };

  const handleThemeColorChange = (newColor: ThemeColor) => {
    setThemeColor(newColor);
    savePreferences(lang, newColor, themeMode);
  };

  const handleThemeModeChange = (newMode: ThemeMode) => {
    setThemeMode(newMode);
    savePreferences(lang, themeColor, newMode);
  };

  // ===================== Welcome Flow Handlers =====================
  const handlePresetSelect = (presetId: PresetId) => {
    setSelectedPreset(presetId);
    setWelcomeStep('configure');
  };

  const handleWelcomeComplete = async () => {
    if (!settings || !selectedPreset || !welcomeApiKey.trim()) return;

    const preset = PROVIDER_PRESETS.find(p => p.id === selectedPreset);
    if (!preset) return;

    // Create a new provider based on the preset
    const providerName = t(preset.nameKey);
    const newSettings = { ...settings, tmp: { ...settings.tmp } };

    // Store the provider config in tmp
    newSettings.tmp[`${providerName}-ANTHROPIC_AUTH_TOKEN`] = welcomeApiKey.trim();
    if (preset.baseUrl) {
      newSettings.tmp[`${providerName}-ANTHROPIC_BASE_URL`] = preset.baseUrl;
    }
    if (preset.defaultModels.length > 0) {
      newSettings.tmp[`${providerName}-SUPPORTED_MODELS`] = preset.defaultModels.join(',');
    }
    newSettings.tmp[`${providerName}-API_TIMEOUT_MS`] = '3000000';
    newSettings.tmp[`${providerName}-CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`] = 1;

    // Set as active provider and apply to env
    newSettings.tmp.CURRENT_ACTIVE_PROVIDER = providerName;
    newSettings.env.ANTHROPIC_AUTH_TOKEN = welcomeApiKey.trim();
    if (preset.baseUrl) {
      newSettings.env.ANTHROPIC_BASE_URL = preset.baseUrl;
    }

    // Mark welcome as skipped
    newSettings.tmp.APP_SKIP_WELCOME = 1;

    try {
      await invoke("write_settings", { path: filePath, content: JSON.stringify(newSettings, null, 2) });
      setSettings(newSettings);
      setProviders([DEFAULT_PROVIDER, providerName]);
      setActiveProvider(DEFAULT_PROVIDER);
      setCurrentConfig({
        ANTHROPIC_AUTH_TOKEN: welcomeApiKey.trim(),
        ANTHROPIC_BASE_URL: preset.baseUrl || '',
        API_TIMEOUT_MS: '3000000',
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 1,
        ANTHROPIC_DEFAULT_HAIKU_MODEL: '',
        ANTHROPIC_DEFAULT_SONNET_MODEL: '',
        ANTHROPIC_DEFAULT_OPUS_MODEL: '',
        SUPPORTED_MODELS: preset.defaultModels.join(','),
      });
      setShowWelcomeCard(false);
      showToast(t('saveSuccess'), 'success');
    } catch (err) {
      console.error(err);
      showToast(t('saveFileFailed') + err, 'error');
    }
  };

  const handleSaveUnsavedAsProvider = async (providerName: string) => {
    if (!settings || !currentConfig || !providerName.trim()) return;

    const newSettings = { ...settings, tmp: { ...settings.tmp } };

    // Store the current env config as a new provider
    newSettings.tmp[`${providerName}-ANTHROPIC_AUTH_TOKEN`] = currentConfig.ANTHROPIC_AUTH_TOKEN;
    if (currentConfig.ANTHROPIC_BASE_URL) {
      newSettings.tmp[`${providerName}-ANTHROPIC_BASE_URL`] = currentConfig.ANTHROPIC_BASE_URL;
    }
    newSettings.tmp[`${providerName}-API_TIMEOUT_MS`] = currentConfig.API_TIMEOUT_MS;
    newSettings.tmp[`${providerName}-CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`] = currentConfig.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC;
    if (currentConfig.ANTHROPIC_DEFAULT_HAIKU_MODEL) {
      newSettings.tmp[`${providerName}-ANTHROPIC_DEFAULT_HAIKU_MODEL`] = currentConfig.ANTHROPIC_DEFAULT_HAIKU_MODEL;
    }
    if (currentConfig.ANTHROPIC_DEFAULT_SONNET_MODEL) {
      newSettings.tmp[`${providerName}-ANTHROPIC_DEFAULT_SONNET_MODEL`] = currentConfig.ANTHROPIC_DEFAULT_SONNET_MODEL;
    }
    if (currentConfig.ANTHROPIC_DEFAULT_OPUS_MODEL) {
      newSettings.tmp[`${providerName}-ANTHROPIC_DEFAULT_OPUS_MODEL`] = currentConfig.ANTHROPIC_DEFAULT_OPUS_MODEL;
    }
    if (currentConfig.SUPPORTED_MODELS) {
      newSettings.tmp[`${providerName}-SUPPORTED_MODELS`] = currentConfig.SUPPORTED_MODELS;
    }

    // Set as active provider
    newSettings.tmp.CURRENT_ACTIVE_PROVIDER = providerName;

    try {
      await invoke("write_settings", { path: filePath, content: JSON.stringify(newSettings, null, 2) });
      setSettings(newSettings);
      setProviders(prev => [...prev, providerName]);
      setShowUnsavedPrompt(false);
      showToast(t('saveAsProviderSuccess', { provider: providerName }), 'success');
    } catch (err) {
      console.error(err);
      showToast(t('saveFileFailed') + err, 'error');
    }
  };

  const handleSkipWelcome = async () => {
    if (!settings) return;
    const newSettings = { ...settings, tmp: { ...settings.tmp } };
    newSettings.tmp.APP_SKIP_WELCOME = 1;
    try {
      await invoke("write_settings", { path: filePath, content: JSON.stringify(newSettings, null, 2) });
      setSettings(newSettings);
      setShowWelcomeCard(false);
    } catch (err) {
      console.error(err);
    }
  };

  // ===================== Model Options =====================
  const modelOptions = currentConfig?.SUPPORTED_MODELS
    ? currentConfig.SUPPORTED_MODELS.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
    : [];

  const renderModelField = (label: string, field: keyof ProviderConfig, placeholder: string) => {
    if (!currentConfig) return null;
    const currentValue = currentConfig[field] as string;
    const hasCurrentInOptions = modelOptions.includes(currentValue);

    return (
      <div className="form-group" style={{ marginBottom: '1.2rem' }}>
        {modelOptions.length > 0 ? (
          <md-outlined-select
            key={`${activeProvider}-${field}`}
            label={label}
            value={currentValue}
            onChange={(e: any) => handleInputChange(field, e.target.value)}
            style={{ width: '100%' }}
          >
            <md-select-option value="">
              <div slot="headline">{t('selectPlaceholder')}</div>
            </md-select-option>
            {currentValue && !hasCurrentInOptions && (
              <md-select-option value={currentValue}>
                <div slot="headline">{currentValue} {t('modelNotInList')}</div>
              </md-select-option>
            )}
            {modelOptions.map(m => (
              <md-select-option key={m} value={m}>
                <div slot="headline">{m}</div>
              </md-select-option>
            ))}
          </md-outlined-select>
        ) : (
          <md-outlined-text-field
            type="text"
            label={label}
            value={currentValue}
            onInput={(e: any) => handleInputChange(field, e.target.value)}
            placeholder={placeholder}
            style={{ width: '100%' }}
          ></md-outlined-text-field>
        )}
      </div>
    );
  };

  // ===================== Render: Provider Page =====================
  const renderProviderPage = () => (
    <div className="provider-page">
      <h1>{t('appTitle')}</h1>

      <div className="card file-selector">
        <md-filled-button onClick={openFile}>{t('selectFile')}</md-filled-button>
        <div className="file-path">{filePath || t('filePlaceholder')}</div>
      </div>

      {/* Welcome Card for first-time users */}
      {showWelcomeCard && settings && (
        <WelcomeCard
          t={t}
          presets={PROVIDER_PRESETS}
          selectedPreset={selectedPreset}
          welcomeApiKey={welcomeApiKey}
          welcomeStep={welcomeStep}
          onPresetSelect={handlePresetSelect}
          onApiKeyChange={setWelcomeApiKey}
          onComplete={handleWelcomeComplete}
          onSkip={handleSkipWelcome}
        />
      )}

      {/* Unsaved config banner */}
      {showUnsavedPrompt && settings && currentConfig && !showWelcomeCard && (
        <UnsavedConfigBanner
          t={t}
          onSaveAsProvider={handleSaveUnsavedAsProvider}
          onDismiss={() => setShowUnsavedPrompt(false)}
        />
      )}

      {settings && currentConfig && !showWelcomeCard && (
        <div className="card">
          <div className="header-row">
            <div className="provider-list">
              {providers.map((p) => (
                <div
                  key={p}
                  className={`provider-tab ${activeProvider === p ? "active" : ""}`}
                  onClick={() => switchProvider(p)}
                >
                  {p === DEFAULT_PROVIDER ? t('currentActive') : p}
                </div>
              ))}
              <div className="provider-tab add-btn" onClick={addNewProvider}>
                <md-icon style={{ verticalAlign: 'middle', fontSize: '18px' }}>add</md-icon> {t('add')}
              </div>
            </div>
            {activeProvider !== DEFAULT_PROVIDER && (
              <md-text-button onClick={deleteProvider}>
                <md-icon slot="icon">delete</md-icon> {t('delete')}
              </md-text-button>
            )}
          </div>

          {activeProvider === DEFAULT_PROVIDER && settings.tmp.CURRENT_ACTIVE_PROVIDER && (
            <div style={{ background: 'var(--md-sys-color-secondary-container)', color: 'var(--md-sys-color-on-secondary-container)', padding: '16px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <md-icon>info</md-icon>
              <span>
                {t('activeProviderInfo')}
                <strong style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={async () => {
                  const targetProvider = settings.tmp.CURRENT_ACTIVE_PROVIDER as string;
                  const go = await asyncConfirm(t('switchProviderConfirm', { provider: targetProvider }), t('switchProviderTitle'));
                  if (go) switchProvider(targetProvider);
                }}>{settings.tmp.CURRENT_ACTIVE_PROVIDER as string}</strong>
                {t('activeProviderNote')}
              </span>
            </div>
          )}

          {activeProvider !== DEFAULT_PROVIDER && (
            <div className="form-group">
              <label>{t('modelList')}</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                {modelOptions.map((m) => (
                  <md-filter-chip key={m} label={m} removable selected onClick={() => handleRemoveModel(m)}></md-filter-chip>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <md-outlined-text-field
                  value={newModelInput}
                  onInput={(e: any) => setNewModelInput(e.target.value)}
                  onKeyDown={(e: any) => { if (e.key === 'Enter') handleAddModel(); }}
                  placeholder={t('modelInputPlaceholder')}
                  style={{ flex: 1 }}
                >
                  <md-icon slot="leading-icon">library_add</md-icon>
                </md-outlined-text-field>
                <md-outlined-button onClick={handleAddModel}>
                  {t('addModel')}
                </md-outlined-button>
              </div>
            </div>
          )}

          <div className="form-group">
            <md-outlined-text-field
              type="password"
              label="API Key (ANTHROPIC_AUTH_TOKEN)"
              value={currentConfig.ANTHROPIC_AUTH_TOKEN}
              onInput={(e: any) => handleInputChange("ANTHROPIC_AUTH_TOKEN", e.target.value)}
              onClick={async () => {
                if (activeProvider === DEFAULT_PROVIDER && settings.tmp.CURRENT_ACTIVE_PROVIDER) {
                  const targetProvider = settings.tmp.CURRENT_ACTIVE_PROVIDER as string;
                  const go = await asyncConfirm(t('tokenReadonly', { provider: targetProvider }), t('hint'));
                  if (go) switchProvider(targetProvider);
                }
              }}
              placeholder="sk-..."
              disabled={activeProvider === DEFAULT_PROVIDER}
              style={{ width: '100%', cursor: activeProvider === DEFAULT_PROVIDER ? 'pointer' : 'text' }}
            ></md-outlined-text-field>
          </div>

          <div className="form-group">
            <md-outlined-text-field
              type="text"
              label="API Base URL (ANTHROPIC_BASE_URL)"
              value={currentConfig.ANTHROPIC_BASE_URL}
              onInput={(e: any) => handleInputChange("ANTHROPIC_BASE_URL", e.target.value)}
              onClick={async () => {
                if (activeProvider === DEFAULT_PROVIDER && settings.tmp.CURRENT_ACTIVE_PROVIDER) {
                  const targetProvider = settings.tmp.CURRENT_ACTIVE_PROVIDER as string;
                  const go = await asyncConfirm(t('urlReadonly', { provider: targetProvider }), t('hint'));
                  if (go) switchProvider(targetProvider);
                }
              }}
              placeholder="https://api.anthropic.com/"
              disabled={activeProvider === DEFAULT_PROVIDER}
              style={{ width: '100%', cursor: activeProvider === DEFAULT_PROVIDER ? 'pointer' : 'text' }}
            ></md-outlined-text-field>
          </div>

          <div className="form-row">
            {renderModelField("Opus Model", "ANTHROPIC_DEFAULT_OPUS_MODEL", t('opusPlaceholder'))}
            {renderModelField("Sonnet Model", "ANTHROPIC_DEFAULT_SONNET_MODEL", t('sonnetPlaceholder'))}
            {renderModelField("Haiku Model", "ANTHROPIC_DEFAULT_HAIKU_MODEL", t('haikuPlaceholder'))}
          </div>

          <div className="actions">
            {activeProvider !== DEFAULT_PROVIDER && (
              <md-outlined-button onClick={applyAsEnv} disabled={isSaving}>
                <md-icon slot="icon">check_circle</md-icon> {t('applyToEnv')}
              </md-outlined-button>
            )}
            <md-filled-button onClick={saveToFile} disabled={isSaving}>
              <md-icon slot="icon">save</md-icon> {isSaving ? t('saving') : t('save')}
            </md-filled-button>
          </div>
        </div>
      )}
    </div>
  );

  // ===================== Render: Settings Page =====================
  const renderSettingsPage = () => (
    <div className="settings-page">
      <h1>{t('settingsTitle')}</h1>

      <div className="card">
        <div className="settings-section">
          <label>{t('language')}</label>
          <div className="settings-chips">
            <md-filter-chip
              label="中文"
              selected={lang === 'zh' ? true : undefined}
              onClick={() => handleLangChange('zh')}
            ></md-filter-chip>
            <md-filter-chip
              label="English"
              selected={lang === 'en' ? true : undefined}
              onClick={() => handleLangChange('en')}
            ></md-filter-chip>
          </div>
        </div>

        <div className="settings-section">
          <label>{t('themeColor')}</label>
          <div className="theme-swatches">
            {(Object.keys(THEME_SWATCH_COLORS) as ThemeColor[]).map((colorId) => (
              <div
                key={colorId}
                className={`theme-swatch ${themeColor === colorId ? 'active' : ''}`}
                style={{ backgroundColor: THEME_SWATCH_COLORS[colorId] }}
                onClick={() => handleThemeColorChange(colorId)}
                title={colorId}
              >
                {themeColor === colorId && (
                  <md-icon style={{ color: '#ffffff', fontSize: '20px' }}>check</md-icon>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <label>{t('appearance')}</label>
          <div className="settings-chips">
            <md-filter-chip
              label={t('lightMode')}
              selected={themeMode === 'light' ? true : undefined}
              onClick={() => handleThemeModeChange('light')}
            >
              <md-icon slot="icon">light_mode</md-icon>
            </md-filter-chip>
            <md-filter-chip
              label={t('darkMode')}
              selected={themeMode === 'dark' ? true : undefined}
              onClick={() => handleThemeModeChange('dark')}
            >
              <md-icon slot="icon">dark_mode</md-icon>
            </md-filter-chip>
          </div>
        </div>
      </div>
    </div>
  );

  // ===================== Main Render =====================
  return (
    <div className="app-wrapper">
      <Titlebar />
      <div className="app-body">
        {isWide && (
          <NavigationRail activePage={activePage} onPageChange={setActivePage} t={t} />
        )}
        <main className="content-area">
          {activePage === 'providers' && renderProviderPage()}
          {activePage === 'settings' && renderSettingsPage()}
        </main>
      </div>
      {!isWide && (
        <BottomNav activePage={activePage} onPageChange={setActivePage} t={t} />
      )}

      <ToastContainer toasts={toasts} />

      <CustomConfirmModal
        isOpen={confirmModalData.isOpen}
        title={confirmModalData.title}
        content={<p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{confirmModalData.content}</p>}
        isDanger={confirmModalData.isDanger}
        onConfirm={confirmModalData.onConfirm}
        onCancel={confirmModalData.onCancel}
        cancelLabel={t('cancel')}
        confirmLabel={t('confirm')}
      />
      <CustomPromptModal
        isOpen={promptModalData.isOpen}
        title={promptModalData.title}
        onConfirm={promptModalData.onConfirm}
        onCancel={promptModalData.onCancel}
        cancelLabel={t('cancel')}
        confirmLabel={t('confirm')}
        placeholder={t('promptPlaceholder')}
      />
    </div>
  );
}

export default App;
