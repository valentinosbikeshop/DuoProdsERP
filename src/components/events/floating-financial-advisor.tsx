'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, FileUp, Loader2, Sparkles, AlertCircle, ChevronDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Event, EventItem } from '@/types';
import { cn } from '@/lib/utils';
import { FileUpload } from '@/components/events/file-upload';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface FloatingFinancialAdvisorProps {
  event: Event;
  items: EventItem[];
}

export function FloatingFinancialAdvisor({ event, items }: FloatingFinancialAdvisorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `¡Hola! Soy tu Asesor Financiero IA de DUO Producciones. Estoy aquí para analizar el presupuesto de **${event.name}**. Actualmente tenemos **${items.length}** ítems aprobados. ¿En qué te puedo ayudar para mejorar la rentabilidad o reducir costos?`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedText, setParsedText] = useState('');
  const [showFileUploader, setShowFileUploader] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend: string, textFile: string) => {
    if (!textToSend.trim() && !textFile) return;

    const userMessageContent = textToSend.trim() + (textFile ? `\n[Archivo adjunto]: ${textFile.substring(0, 500)}...` : '');
    
    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: userMessageContent }
    ];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    
    // Clear parsed text after sending
    setParsedText(''); 
    setShowFileUploader(false);

    try {
      const response = await fetch('/api/ai/financial-advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages,
          eventData: {
            name: event.name,
            description: event.description,
            status: event.status,
            client: event.client_company,
            date: event.event_date
          },
          approvedItems: items,
          filesText: textFile
        }),
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.reply }
      ]);
      
    } catch (error) {
      console.error('Error in AI Advisor:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Lo siento, he encontrado un problema analizando los datos. Mis servidores pueden estar saturados, por favor intenta de nuevo.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    handleSendMessage(input, parsedText);
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion, parsedText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: `¡Hola! Soy tu Asesor Financiero IA de DUO Producciones. Estoy aquí para analizar el presupuesto de **${event.name}**. Actualmente tenemos **${items.length}** ítems aprobados. ¿En qué te puedo ayudar para mejorar la rentabilidad o reducir costos?`
    }]);
    setParsedText('');
  };

  return (
    <>
      {/* Botón Flotante */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-14 w-14 rounded-full shadow-2xl transition-all duration-300 relative",
            isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100 animate-bounce hover:scale-110",
            "bg-gradient-to-br from-primary via-primary/90 to-primary/70 hover:from-primary hover:to-primary border border-primary/20"
          )}
        >
          <Sparkles className="h-6 w-6 text-primary-foreground absolute top-3 right-3 animate-pulse opacity-70" />
          <Bot className="h-7 w-7 text-primary-foreground" />
        </Button>
      </div>

      {/* Panel de Chat */}
      <div 
        className={cn(
          "fixed bottom-6 right-6 z-50 w-[380px] sm:w-[420px] max-w-[calc(100vw-2rem)] transition-all duration-300 origin-bottom-right",
          isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-50 opacity-0 pointer-events-none translate-y-8"
        )}
      >
        <div className="flex flex-col bg-card/90 backdrop-blur-xl border border-border/50 shadow-2xl rounded-2xl overflow-hidden h-[600px] max-h-[calc(100vh-6rem)]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-transparent border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20 border border-primary/30 shadow-inner">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  Asesor Financiero
                  <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                </h3>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  Analista IA DUO
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full" onClick={clearChat} title="Limpiar Chat">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full" onClick={() => setIsOpen(false)}>
                <ChevronDown className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "flex max-w-[85%] text-sm",
                  msg.role === 'user' ? "ml-auto justify-end" : "mr-auto justify-start"
                )}
              >
                <div 
                  className={cn(
                    "px-4 py-2.5 rounded-2xl shadow-sm whitespace-pre-wrap",
                    msg.role === 'user' 
                      ? "bg-primary text-primary-foreground rounded-tr-sm" 
                      : "bg-muted/60 border border-border/50 text-foreground rounded-tl-sm backdrop-blur-md"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Quick Actions / Suggestions */}
            {messages.length === 1 && !isLoading && (
              <div className="flex flex-col gap-2 mt-2 px-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="justify-start text-xs font-normal border-primary/30 text-primary hover:bg-primary/10 rounded-xl h-auto py-2 whitespace-normal text-left"
                  onClick={() => handleSuggestionClick("Haz un análisis exhaustivo de los ítems aprobados, con recomendaciones y críticas para mejorar la rentabilidad.")}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-2 shrink-0" />
                  Análisis exhaustivo con recomendaciones y críticas
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="justify-start text-xs font-normal border-border text-muted-foreground hover:text-foreground rounded-xl h-auto py-2 whitespace-normal text-left"
                  onClick={() => handleSuggestionClick("¿Dónde ves que podríamos mejorar el margen de ganancia?")}
                >
                  ¿Dónde ves que podríamos mejorar el margen de ganancia?
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="justify-start text-xs font-normal border-border text-muted-foreground hover:text-foreground rounded-xl h-auto py-2 whitespace-normal text-left"
                  onClick={() => handleSuggestionClick("¿Falta algún ítem logístico o de gastos básicos (fletes, hielo, personal, etc)?")}
                >
                  ¿Falta algún ítem logístico o de gastos básicos?
                </Button>
              </div>
            )}
            
            {isLoading && (
              <div className="flex max-w-[85%] mr-auto justify-start text-sm">
                <div className="px-4 py-3 rounded-2xl bg-muted/60 border border-border/50 rounded-tl-sm flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="h-1.5 w-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="h-1.5 w-1.5 bg-primary/60 rounded-full animate-bounce"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Context Indicators */}
          {(parsedText || showFileUploader) && (
            <div className="px-4 py-2 bg-muted/30 border-t border-border/30 text-xs">
              {showFileUploader ? (
                <div className="relative">
                  <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-6 w-6 z-10 rounded-full bg-background border shadow-sm" onClick={() => setShowFileUploader(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                  <FileUpload 
                    onParsed={(text) => {
                      setParsedText(prev => prev ? prev + '\n' + text : text);
                      setShowFileUploader(false);
                    }} 
                  />
                </div>
              ) : parsedText ? (
                <div className="flex items-center justify-between text-primary bg-primary/5 px-2 py-1.5 rounded border border-primary/20">
                  <div className="flex items-center gap-1.5 font-medium">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Documento adjunto listo ({parsedText.length} chars)</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => setParsedText('')}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : null}
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 bg-background/80 backdrop-blur-sm border-t border-border/40">
            <div className="relative flex items-end gap-2 bg-muted/40 p-1.5 rounded-2xl border border-border/60 focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-9 w-9 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={() => setShowFileUploader(!showFileUploader)}
                title="Adjuntar cotización o documento"
              >
                <FileUp className="h-4.5 w-4.5" />
              </Button>
              
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ej. ¿Cómo puedo bajar los costos de gastronomía?"
                className="w-full max-h-32 min-h-[40px] bg-transparent border-0 focus:ring-0 resize-none py-2 px-1 text-sm custom-scrollbar"
                rows={1}
              />
              
              <Button
                size="icon"
                className="shrink-0 h-9 w-9 rounded-xl bg-primary shadow-sm hover:bg-primary/90"
                onClick={handleSubmit}
                disabled={(!input.trim() && !parsedText) || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
