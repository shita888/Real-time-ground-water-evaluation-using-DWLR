import { useState, useEffect } from 'react';
import { Mic, MicOff, ArrowLeft, Phone, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useConversation } from '@11labs/react';

interface VoiceAssistantProps {
  onBack: () => void;
  elevenlabsKey: string;
}

export function VoiceAssistant({ onBack, elevenlabsKey }: VoiceAssistantProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [agentId, setAgentId] = useState('');
  const { toast } = useToast();

  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to voice assistant');
      toast({
        title: "Voice Assistant Connected",
        description: "You can now speak with the AI assistant",
      });
    },
    onDisconnect: () => {
      console.log('Disconnected from voice assistant');
    },
    onError: (error) => {
      console.error('Voice assistant error:', error);
      toast({
        title: "Voice Assistant Error",
        description: "Failed to connect to voice assistant",
        variant: "destructive",
      });
    },
    clientTools: {
      getStationInfo: (parameters: { stationId: string }) => {
        toast({
          title: "Station Info",
          description: `Getting information for station ${parameters.stationId}`,
        });
        return `Station ${parameters.stationId} has a current water level of 15.2m with normal status`;
      },
      searchNearbyStations: (parameters: { location?: string }) => {
        toast({
          title: "Nearby Stations",
          description: "Searching for nearby monitoring stations",
        });
        return "Found 3 nearby stations within 10km radius";
      }
    }
  });

  const { status, isSpeaking } = conversation;

  useEffect(() => {
    // Request microphone permission on component mount
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        setIsInitialized(true);
      })
      .catch((error) => {
        console.error('Microphone access denied:', error);
        toast({
          title: "Microphone Access Required",
          description: "Please allow microphone access to use voice assistant",
          variant: "destructive",
        });
      });
  }, []);

  const startConversation = async () => {
    if (!elevenlabsKey) {
      toast({
        title: "API Key Required",
        description: "Please configure your ElevenLabs API key",
        variant: "destructive",
      });
      return;
    }

    try {
      // Note: In a real implementation, you would create an agent on ElevenLabs
      // and use the actual agent ID. For demo purposes, we'll show the UI structure.
      toast({
        title: "Demo Mode",
        description: "Voice assistant is in demo mode. Please configure a real ElevenLabs agent ID.",
        variant: "destructive",
      });
      
      // Uncomment and modify this when you have a real agent ID:
      // await conversation.startSession({ 
      //   agentId: 'your-agent-id-here' 
      // });
    } catch (error) {
      console.error('Failed to start conversation:', error);
      toast({
        title: "Connection Failed",
        description: "Could not connect to voice assistant",
        variant: "destructive",
      });
    }
  };

  const endConversation = async () => {
    try {
      await conversation.endSession();
    } catch (error) {
      console.error('Failed to end conversation:', error);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-xl font-semibold">Voice Assistant</h3>
      </div>

      <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardContent className="p-6 text-center space-y-4">
          <div className="space-y-2">
            <div className={`p-6 rounded-full mx-auto w-fit transition-all duration-200 ${
              status === 'connected' 
                ? 'bg-green-100 text-green-600' 
                : 'bg-gray-100 text-gray-400'
            }`}>
              <Mic className="h-12 w-12" />
            </div>
            
            <div className="space-y-1">
              <h4 className="font-semibold">
                {status === 'connected' ? 'Voice Assistant Active' : 'Voice Assistant Ready'}
              </h4>
              <p className="text-sm text-muted-foreground">
                {status === 'connected' 
                  ? 'Speak naturally about groundwater data and monitoring'
                  : 'Click the button below to start voice conversation'
                }
              </p>
            </div>

            <div className="flex justify-center">
              <Badge 
                variant={status === 'connected' ? 'default' : 'secondary'}
                className="capitalize"
              >
                {status === 'connected' && isSpeaking && '🎤 AI Speaking'}
                {status === 'connected' && !isSpeaking && '👂 Listening'}
                {status !== 'connected' && 'Disconnected'}
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            {status !== 'connected' ? (
              <Button 
                onClick={startConversation}
                disabled={!isInitialized}
                size="lg"
                className="w-full"
              >
                <Phone className="h-4 w-4 mr-2" />
                Start Voice Conversation
              </Button>
            ) : (
              <Button 
                onClick={endConversation}
                variant="destructive"
                size="lg"
                className="w-full"
              >
                <PhoneOff className="h-4 w-4 mr-2" />
                End Conversation
              </Button>
            )}

            {!isInitialized && (
              <p className="text-xs text-red-500">
                Microphone access is required for voice assistance
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h5 className="font-medium mb-2">What you can ask:</h5>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• "What's the water level at station DWLR001?"</li>
            <li>• "Show me nearby monitoring stations"</li>
            <li>• "What's the current recharge rate?"</li>
            <li>• "Which stations are in critical condition?"</li>
            <li>• "Explain the water level trends"</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}