import { useState, useEffect } from 'react';
import { Bot, MessageCircle, Mic, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { VoiceAssistant } from './VoiceAssistant';
import { ChatAssistant } from './ChatAssistant';
import { useToast } from '@/hooks/use-toast';

type AssistantMode = 'selection' | 'voice' | 'chat' | 'settings';

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AssistantMode>('selection');
  const [apiKeys, setApiKeys] = useState({
    openai: localStorage.getItem('groundwater_openai_key') || '',
    elevenlabs: localStorage.getItem('groundwater_elevenlabs_key') || ''
  });
  const { t } = useLanguage();
  const { toast } = useToast();

  const saveApiKeys = () => {
    localStorage.setItem('groundwater_openai_key', apiKeys.openai);
    localStorage.setItem('groundwater_elevenlabs_key', apiKeys.elevenlabs);
    toast({
      title: "API Keys Saved",
      description: "Your API keys have been saved locally.",
    });
    setMode('selection');
  };

  const hasRequiredKeys = () => {
    return apiKeys.openai.trim() !== '' && apiKeys.elevenlabs.trim() !== '';
  };

  return (
    <>
      {/* Floating Assistant Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full h-16 w-16 shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-primary to-secondary"
        >
          <Bot className="h-8 w-8" />
        </Button>
      </div>

      {/* Assistant Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Groundwater AI Assistant
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode('settings')}
                className="ml-auto"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {/* Mode Selection */}
          {mode === 'selection' && (
            <div className="space-y-6 p-4">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">How would you like assistance?</h3>
                <p className="text-muted-foreground">
                  Choose your preferred way to interact with the AI assistant
                </p>
              </div>

              {!hasRequiredKeys() && (
                <Card className="border-orange-200 bg-orange-50/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Settings className="h-4 w-4 text-orange-600" />
                      <span className="font-medium text-orange-800">Setup Required</span>
                    </div>
                    <p className="text-sm text-orange-700 mb-3">
                      Please configure your API keys in settings to use the AI assistant.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setMode('settings')}
                      className="border-orange-300"
                    >
                      Configure API Keys
                    </Button>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    !hasRequiredKeys() ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={() => hasRequiredKeys() && setMode('voice')}
                >
                  <CardContent className="p-6 text-center space-y-4">
                    <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto">
                      <Mic className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Voice Assistant</h4>
                      <p className="text-sm text-muted-foreground">
                        Speak naturally and get voice responses about groundwater data
                      </p>
                    </div>
                    <Badge variant="secondary">Real-time conversation</Badge>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    !hasRequiredKeys() ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={() => hasRequiredKeys() && setMode('chat')}
                >
                  <CardContent className="p-6 text-center space-y-4">
                    <div className="p-4 rounded-full bg-secondary/10 w-fit mx-auto">
                      <MessageCircle className="h-8 w-8 text-secondary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Chat Assistant</h4>
                      <p className="text-sm text-muted-foreground">
                        Type your questions and get detailed text responses
                      </p>
                    </div>
                    <Badge variant="secondary">Text-based help</Badge>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Voice Assistant */}
          {mode === 'voice' && (
            <VoiceAssistant 
              onBack={() => setMode('selection')}
              elevenlabsKey={apiKeys.elevenlabs}
            />
          )}

          {/* Chat Assistant */}
          {mode === 'chat' && (
            <ChatAssistant 
              onBack={() => setMode('selection')}
              openaiKey={apiKeys.openai}
            />
          )}

          {/* Settings */}
          {mode === 'settings' && (
            <div className="space-y-6 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setMode('selection')}
                >
                  <X className="h-4 w-4" />
                </Button>
                <h3 className="text-xl font-semibold">API Configuration</h3>
              </div>

              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-800">Recommended: Connect to Supabase</h4>
                    <p className="text-sm text-blue-700">
                      For secure API key storage, we recommend connecting your project to Supabase.
                      This will safely store your keys server-side.
                    </p>
                    <Button variant="outline" size="sm" className="border-blue-300">
                      <a href="https://docs.lovable.dev/supabase/setup" target="_blank" rel="noopener noreferrer">
                        Connect to Supabase
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="openai-key">OpenAI API Key</Label>
                  <Input
                    id="openai-key"
                    type="password"
                    placeholder="sk-..."
                    value={apiKeys.openai}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary">OpenAI Platform</a>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="elevenlabs-key">ElevenLabs API Key</Label>
                  <Input
                    id="elevenlabs-key"
                    type="password"
                    placeholder="..."
                    value={apiKeys.elevenlabs}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, elevenlabs: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Get your API key from <a href="https://elevenlabs.io/" target="_blank" rel="noopener noreferrer" className="text-primary">ElevenLabs Dashboard</a>
                  </p>
                </div>

                <Button onClick={saveApiKeys} className="w-full">
                  Save Configuration
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}