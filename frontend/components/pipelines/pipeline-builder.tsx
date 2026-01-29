"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { TransformationBuilder } from "./transformation-builder";
import { QualityBuilder } from "./quality-builder";

const pipelineFormSchema = z.object({
    name: z.string().min(2, "Name is required"),
    sourceType: z.string(),
    sourceConfig: z.object({
        connectionId: z.string().optional(), // If using existing connection
        tableName: z.string().optional(),
        endpoint: z.string().optional(),
    }),
    destinationType: z.string().default("INTERNAL_RAW"),
    mode: z.string().default("ELT"),
    transformationSteps: z.array(z.any()).optional(), // Added
    qualityRules: z.array(z.any()).optional(), // Phase 21
    scheduleCron: z.string().optional(),
});

type PipelineFormValues = z.infer<typeof pipelineFormSchema>;

interface PipelineBuilderProps {
    workspaceId: string;
}

export function PipelineBuilder({ workspaceId }: PipelineBuilderProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<PipelineFormValues>({
        resolver: zodResolver(pipelineFormSchema),
        defaultValues: {
            name: "",
            sourceType: "postgres",
            sourceConfig: {},
            destinationType: "INTERNAL_RAW",
            mode: "ELT",

            transformationSteps: [],
            qualityRules: [],
            scheduleCron: "0 * * * *", // Hourly default
        },
    });

    const sourceType = form.watch("sourceType");
    const mode = form.watch("mode"); // Watch mode to conditionally show help text

    async function onSubmit(data: PipelineFormValues) {
        setIsSubmitting(true);
        try {
            const payload = {
                ...data,
                workspaceId,
                // Simplify source config structure for now
                sourceConfig: sourceType === 'postgres'
                    ? { tableName: data.sourceConfig.tableName }
                    : { endpoint: data.sourceConfig.endpoint }
            };

            const response = await fetch("/api/pipelines", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(err);
            }

            toast.success("Pipeline created successfully");
            router.push(`/workspace/${workspaceId}/pipelines`);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto p-6 border rounded-lg bg-card mb-20">
            <h1 className="text-2xl font-bold mb-6">Create New Data Pipeline</h1>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="space-y-6">
                        <div className="p-4 border rounded bg-muted/10 space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Pipeline Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Sync Users Daily" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* SOURCE TYPE & MODE SELECTORS (Keeping previous logic) */}
                            <FormField
                                control={form.control}
                                name="sourceType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Source Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a source" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="postgres">Postgres Database</SelectItem>
                                                <SelectItem value="rest">REST API</SelectItem>
                                                <SelectItem value="csv">CSV File Upload</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="mode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Processing Mode</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select processing mode" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="ELT">ELT (Extract &rarr; Load &rarr; Transform)</SelectItem>
                                                <SelectItem value="ETL">ETL (Extract &rarr; Transform &rarr; Load)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            {field.value === 'ELT'
                                                ? "Best for large datasets. Transforms happen in SQL after loading."
                                                : "Best for cleaning/filtering before storage. Transforms happen in-memory."}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* SOURCE CONFIG BLOCKS */}
                        {sourceType === 'postgres' && (
                            <div className="p-4 border rounded bg-muted/20 space-y-4">
                                <FormField
                                    control={form.control}
                                    name="sourceConfig.tableName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Table Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="public.users" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        {sourceType === 'rest' && (
                            <div className="p-4 border rounded bg-muted/20 space-y-4">
                                <FormField
                                    control={form.control}
                                    name="sourceConfig.endpoint"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>API Endpoint Path</FormLabel>
                                            <FormControl>
                                                <Input placeholder="/users" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        {/* TRANSFORMATION BUILDER */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Transformations rules</h3>
                            <p className="text-sm text-muted-foreground">
                                Define step-by-step generic rules to clean or filter data.
                                {mode === 'ELT' && <span className="text-amber-600 block mt-1 font-medium">Note: In ELT mode, these run as SQL Generative steps (Simulated for MVP).</span>}
                            </p>

                            <FormField
                                control={form.control}
                                name="transformationSteps"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <TransformationBuilder
                                                steps={field.value || []}
                                                onChange={field.onChange}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* QUALITY RULES (Phase 21) */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Data Quality Assertions</h3>
                            <p className="text-sm text-muted-foreground">
                                Define validation rules. Rows failing these checks can warn or fail the pipeline.
                            </p>

                            <FormField
                                control={form.control}
                                name="qualityRules"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <QualityBuilder
                                                rules={field.value || []}
                                                onChange={field.onChange}
                                            // availableColumns={...} // TODO: Fetch from source schema
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                    </div>

                    <FormField
                        control={form.control}
                        name="scheduleCron"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Schedule (Cron Expression)</FormLabel>
                                <FormControl>
                                    <Input placeholder="0 * * * *" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="flex gap-4 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Creating..." : "Create Pipeline"}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
