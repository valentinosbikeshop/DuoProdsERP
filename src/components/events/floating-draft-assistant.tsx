'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bot, Send, X, FileUp, Loader2, Sparkles, AlertCircle, ChevronDown, Trash2, ListTree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EventItem } from '@/types';
import { cn } from '@/lib/utils';
import { FileUpload } from '@/components/events/file-upload';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface FloatingDraftAssistantProps {
  draftItems: EventItem[];
  onApplyActions: (actions: any[]) => void | Promise<void>;
}

const WELCOME_MESSAGE = `¡Hola! Soy tu Asistente de Borradores IA. Conozco todos los ítems, costos, detalles y jerarquías de esta lista.

Puedo ayudarte con:
• **Consolidar / Agrupar**: "agrupa las empanadas bajo el nombre Empanadas"
• **Desagrupar**: "desarma el grupo de bebidas" o "saca el hielo del grupo"
• **Reordenar**: "ordena por costo de mayor a menor" o "pon la comida primero"
• **Invertir**: "cambia entre detalle y nombre en todos los ítems"
• **Modificar**: "cambia el nombre de X a Y" o "ajusta el costo a $5.000"
• **Facturas**: Adjunta un PDF o imagen de factura para extraer los ítems automáticamente.`;

export function FloatingDraftAssistant({ draftItems, onApplyActions }: FloatingDraftAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: WELCOME_MESSAGE
    }
  ]);

  useEffect(() => {
    setMounted(true);
  }, []);

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

    const userMessageContent = textToSend.trim() + (textFile ? `\n[Archivo adjunto de factura listo]` : '');
    
    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: userMessageContent }
    ];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    
    // Clear parsed text after sending
    const currentFileText = parsedText;
    setParsedText(''); 
    setShowFileUploader(false);

    try {
      const response = await fetch('/api/ai/draft-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages,
          draftItems: draftItems,
          fileText: currentFileText
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.reply }
      ]);

      if (data.actions && data.actions.length > 0) {
        await onApplyActions(data.actions);
      }
      
    } catch (error: any) {
      console.error('Error in AI Draft Assistant:', error);
      const errorMsg = error instanceof Error ? error.message : (typeof error === 'string' ? error : JSON.stringify(error));
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `⚠️ Hubo un problema: ${errorMsg || 'Error desconocido'}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    handleSendMessage(input, parsedText);
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
      content: WELCOME_MESSAGE
    }]);
    setParsedText('');
  };

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Botón Flotante (Violeta para distinguirlo del Asesor Financiero) */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-14 w-14 rounded-full shadow-2xl transition-all duration-300 relative",
            isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100 animate-bounce hover:scale-110",
            "bg-gradient-to-br from-violet-600 via-violet-500 to-indigo-500 hover:from-violet-600 hover:to-violet-500 border border-violet-400/30"
          )}
          title="Asistente de Borradores"
        >
          <Sparkles className="h-6 w-6 text-white absolute top-3 right-3 animate-pulse opacity-70" />
          <ListTree className="h-7 w-7 text-white" />
        </Button>
      </div>

      {/* Panel de Chat */}
      <div 
        className={cn(
          "fixed bottom-6 right-6 z-50 w-[380px] sm:w-[420px] max-w-[calc(100vw-2rem)] transition-all duration-300 origin-bottom-right",
          isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-50 opacity-0 pointer-events-none translate-y-8"
        )}
      >
        <div className="flex flex-col bg-card/95 backdrop-blur-xl border border-border/50 shadow-2xl rounded-2xl overflow-hidden h-[600px] max-h-[calc(100vh-6rem)]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-violet-600/10 to-transparent border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-violet-600/20 border border-violet-500/30 shadow-inner">
                <ListTree className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  Asistente de Borradores
                  <span className="flex h-2 w-2 rounded-full bg-violet-500 animate-pulse"></span>
                </h3>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  IA de Organización
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
                      ? "bg-violet-600 text-white rounded-tr-sm" 
                      : "bg-muted/60 border border-border/50 text-foreground rounded-tl-sm backdrop-blur-md"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex max-w-[85%] mr-auto justify-start text-sm">
                <div className="px-4 py-3 rounded-2xl bg-muted/60 border border-border/50 rounded-tl-sm flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 bg-violet-500/60 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="h-1.5 w-1.5 bg-violet-500/60 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="h-1.5 w-1.5 bg-violet-500/60 rounded-full animate-bounce"></span>
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
                <div className="flex items-center justify-between text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2 py-1.5 rounded border border-violet-500/20">
                  <div className="flex items-center gap-1.5 font-medium">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Factura adjunta lista ({parsedText.length} chars)</span>
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
            <div className="relative flex items-end gap-2 bg-muted/40 p-1.5 rounded-2xl border border-border/60 focus-within:border-violet-500/40 focus-within:ring-1 focus-within:ring-violet-500/20 transition-all">
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-9 w-9 rounded-xl text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-500/10"
                onClick={() => setShowFileUploader(!showFileUploader)}
                title="Adjuntar factura para leer"
              >
                <FileUp className="h-4.5 w-4.5" />
              </Button>
              
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ej. Agrupa las empanadas, invierte nombre y detalle, reordena..."
                className="w-full max-h-32 min-h-[40px] bg-transparent border-0 focus:ring-0 resize-none py-2 px-1 text-sm custom-scrollbar"
                rows={1}
              />
              
              <Button
                size="icon"
                className="shrink-0 h-9 w-9 rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
                onClick={handleSubmit}
                disabled={(!input.trim() && !parsedText) || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
