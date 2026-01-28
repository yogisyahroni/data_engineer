"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Cpu, Search, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { AI_REGISTRY, AIModel } from "@/lib/ai/registry"

interface AIModelSelectorProps {
    selectedModel: AIModel;
    onSelect: (model: AIModel) => void;
}

export function AIModelSelector({ selectedModel, onSelect }: AIModelSelectorProps) {
    const [open, setOpen] = React.useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[200px] justify-between bg-background border-border hover:bg-muted transition-colors"
                >
                    <div className="flex items-center gap-2 truncate">
                        <Cpu className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate">{selectedModel.name}</span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
                <Command className="bg-popover border-none">
                    <CommandInput placeholder="Search AI model..." className="h-9" />
                    <CommandList className="max-h-[300px] scrollbar-hide">
                        <CommandEmpty>No model found.</CommandEmpty>
                        {AI_REGISTRY.map((provider) => (
                            <CommandGroup key={provider.id} heading={provider.name} className="px-2">
                                {provider.models.map((model) => (
                                    <CommandItem
                                        key={model.id}
                                        value={model.id}
                                        onSelect={() => {
                                            onSelect(model)
                                            setOpen(false)
                                        }}
                                        className="flex justify-between items-center cursor-pointer py-2 px-3 hover:bg-muted rounded-sm mt-0.5"
                                    >
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-sm font-medium">{model.name}</span>
                                            <span className="text-[10px] text-muted-foreground line-clamp-1">
                                                {model.description}
                                            </span>
                                        </div>
                                        {selectedModel.id === model.id && (
                                            <Check className="h-4 w-4 text-primary shrink-0" />
                                        )}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ))}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
