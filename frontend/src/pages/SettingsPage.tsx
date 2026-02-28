import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import {
  getSettings,
  updateSettings,
  getModels,
  getHiddenModels,
  addModel,
  deleteModel,
  hideModel,
  unhideModel,
  getOllamaStatus,
} from '../services/api';
import type { AppSettings, ModelOption } from '../types';
import { Save, Trash2, Plus, CheckCircle, Key, Bot, RotateCcw, RefreshCw } from 'lucide-react';

const PROVIDER_OPTIONS = [
  { value: 'google', label: 'Google (Gemini)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'ollama', label: 'Ollama (Local)' },
];

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({
    google_api_key: '',
    gemini_api_key: '',
    openai_api_key: '',
    anthropic_api_key: '',
    ollama_base_url: '',
    default_model: '',
    embedding_model: '',
  });
  const [models, setModels] = useState<ModelOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  const [hiddenModels, setHiddenModels] = useState<ModelOption[]>([]);
  const [newModelValue, setNewModelValue] = useState('');
  const [newModelLabel, setNewModelLabel] = useState('');
  const [newModelProvider, setNewModelProvider] = useState('google');
  const [addingModel, setAddingModel] = useState(false);
  const [modelError, setModelError] = useState('');

  const [ollamaRunning, setOllamaRunning] = useState<boolean | null>(null);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaChecking, setOllamaChecking] = useState(false);

  const refreshModels = () => {
    getModels().then(setModels).catch(() => {});
    getHiddenModels().then(setHiddenModels).catch(() => {});
  };

  const checkOllama = () => {
    setOllamaChecking(true);
    getOllamaStatus()
      .then(s => { setOllamaRunning(s.running); setOllamaModels(s.models); })
      .catch(() => { setOllamaRunning(false); setOllamaModels([]); })
      .finally(() => setOllamaChecking(false));
  };

  useEffect(() => {
    getSettings().then(setSettings).catch(() => {});
    refreshModels();
    checkOllama();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const result = await updateSettings(settings);
      setSaveSuccess(`Saved: ${result.updated.join(', ') || 'no changes'}`);
      setTimeout(() => setSaveSuccess(''), 4000);
      getSettings().then(setSettings);
      checkOllama();
    } catch {
      setSaveError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddModel = async () => {
    if (!newModelValue.trim() || !newModelLabel.trim()) {
      setModelError('Model ID and display name are required');
      return;
    }
    setAddingModel(true);
    setModelError('');
    try {
      await addModel({
        value: newModelValue.trim(),
        label: newModelLabel.trim(),
        provider: newModelProvider,
      });
      setNewModelValue('');
      setNewModelLabel('');
      refreshModels();
    } catch (err: unknown) {
      let msg = 'Failed to add model';
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        msg = axiosErr.response?.data?.detail || msg;
      }
      setModelError(msg);
    } finally {
      setAddingModel(false);
    }
  };

  const handleRemoveModel = async (model: ModelOption) => {
    setModelError('');
    try {
      if (model.builtin) {
        await hideModel(model.value);
      } else if (model.custom && model.id != null) {
        await deleteModel(model.id);
      }
      refreshModels();
    } catch {
      setModelError('Failed to remove model');
    }
  };

  const handleRestoreModel = async (value: string) => {
    setModelError('');
    try {
      await unhideModel(value);
      refreshModels();
    } catch {
      setModelError('Failed to restore model');
    }
  };

  const modelSelectOptions = models.map(m => ({ value: m.value, label: m.label }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure API keys and manage AI models.
        </p>
      </div>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Key className="w-5 h-5 inline-block mr-2 -mt-0.5" />
            API Keys
          </CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Google / Gemini API Key"
            type="password"
            value={settings.gemini_api_key}
            onChange={e =>
              setSettings(s => ({ ...s, gemini_api_key: e.target.value }))
            }
            placeholder="AIza..."
          />
          <Input
            label="OpenAI API Key"
            type="password"
            value={settings.openai_api_key}
            onChange={e =>
              setSettings(s => ({ ...s, openai_api_key: e.target.value }))
            }
            placeholder="sk-..."
          />
          <Input
            label="Anthropic API Key"
            type="password"
            value={settings.anthropic_api_key}
            onChange={e =>
              setSettings(s => ({ ...s, anthropic_api_key: e.target.value }))
            }
            placeholder="sk-ant-..."
          />
          <div>
            <Input
              label="Ollama Base URL"
              value={settings.ollama_base_url}
              onChange={e =>
                setSettings(s => ({ ...s, ollama_base_url: e.target.value }))
              }
              placeholder="http://localhost:11434"
            />
            <div className="mt-2 flex items-center gap-2">
              {ollamaChecking ? (
                <span className="text-xs text-slate-400">Checking...</span>
              ) : ollamaRunning === null ? null : ollamaRunning ? (
                <span className="flex items-center gap-1.5 text-xs text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  Connected
                  {ollamaModels.length > 0 && (
                    <span className="text-slate-400 ml-1">
                      ({ollamaModels.length} model{ollamaModels.length !== 1 ? 's' : ''}: {ollamaModels.slice(0, 3).join(', ')}{ollamaModels.length > 3 ? '...' : ''})
                    </span>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-red-500">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                  Not running
                  <span className="text-slate-400 ml-1">
                    Run <code className="bg-slate-100 px-1 rounded text-[10px]">ollama serve</code>
                  </span>
                </span>
              )}
              <button
                onClick={checkOllama}
                disabled={ollamaChecking}
                className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                title="Refresh Ollama status"
              >
                <RefreshCw className={`w-3 h-3 ${ollamaChecking ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            {modelSelectOptions.length > 0 && (
              <Select
                label="Default Model"
                value={settings.default_model}
                onChange={e =>
                  setSettings(s => ({ ...s, default_model: e.target.value }))
                }
                options={modelSelectOptions}
              />
            )}
          </div>
          <Input
            label="Embedding Model (Ollama)"
            value={settings.embedding_model}
            onChange={e =>
              setSettings(s => ({ ...s, embedding_model: e.target.value }))
            }
            placeholder="nomic-embed-text"
          />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Button onClick={handleSaveSettings} loading={saving}>
            <Save className="w-4 h-4" /> Save Settings
          </Button>
          {saveSuccess && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" /> {saveSuccess}
            </span>
          )}
          {saveError && (
            <span className="text-sm text-red-600">{saveError}</span>
          )}
        </div>
      </Card>

      {/* Model Management */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Bot className="w-5 h-5 inline-block mr-2 -mt-0.5" />
            AI Models
          </CardTitle>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-2 font-medium">Model ID</th>
                <th className="pb-2 font-medium">Display Name</th>
                <th className="pb-2 font-medium">Provider</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium w-20"></th>
              </tr>
            </thead>
            <tbody>
              {models.map(m => (
                <tr
                  key={m.value}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="py-2.5 font-mono text-xs text-slate-700">
                    {m.value}
                  </td>
                  <td className="py-2.5 text-slate-800">{m.label}</td>
                  <td className="py-2.5">
                    <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      {m.provider}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      m.builtin
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}>
                      {m.builtin ? 'Built-in' : 'Custom'}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => handleRemoveModel(m)}
                      className="text-red-400 hover:text-red-600 transition-colors p-1"
                      title={m.builtin ? 'Hide model' : 'Remove model'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-200">
          <h4 className="text-sm font-medium text-slate-700 mb-3">
            Add Custom Model
          </h4>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-48">
              <Select
                label="Provider"
                value={newModelProvider}
                onChange={e => setNewModelProvider(e.target.value)}
                options={PROVIDER_OPTIONS}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Input
                label="Model ID"
                value={newModelValue}
                onChange={e => setNewModelValue(e.target.value)}
                placeholder="e.g. gemini/gemini-2.5-pro"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Input
                label="Display Name"
                value={newModelLabel}
                onChange={e => setNewModelLabel(e.target.value)}
                placeholder="e.g. Gemini 2.5 Pro (Google)"
              />
            </div>
            <Button onClick={handleAddModel} loading={addingModel}>
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
          {modelError && (
            <p className="mt-2 text-sm text-red-600">{modelError}</p>
          )}
        </div>

        {hiddenModels.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-200">
            <h4 className="text-sm font-medium text-slate-700 mb-3">
              Hidden Built-in Models
            </h4>
            <div className="flex flex-wrap gap-2">
              {hiddenModels.map(m => (
                <button
                  key={m.value}
                  onClick={() => handleRestoreModel(m.value)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  title="Restore model"
                >
                  <RotateCcw className="w-3 h-3" />
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
