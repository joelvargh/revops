"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Search,
	X,
} from "lucide-react";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

// --- Types ---

export interface FilterOption {
	label: string;
	value: string;
}
export interface FilterConfig {
	id: string;
	label: string;
	options: FilterOption[];
}

export interface QueryParams {
	filters: Record<string, string>;
	page: number;
	perPage: number;
	search: string;
}

export interface QueryResult<TData> {
	data: TData[];
	pageCount: number;
	total?: number;
}

export interface DataTableProps<TData> {
	columns: ColumnDef<TData, unknown>[];
	defaultPerPage?: number;
	filters?: FilterConfig[];
	queryFn: (params: QueryParams) => Promise<QueryResult<TData>>;
	queryKey: string;
	searchPlaceholder?: string;
}

// --- Component ---

export function DataTable<TData>({
	columns,
	queryKey,
	queryFn,
	searchPlaceholder = "Search...",
	filters = [],
	defaultPerPage = 20,
}: DataTableProps<TData>) {
	// nuqs URL state
	const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
	const [perPage] = useQueryState(
		"perPage",
		parseAsInteger.withDefault(defaultPerPage)
	);
	const [urlSearch, setUrlSearch] = useQueryState(
		"q",
		parseAsString.withDefault("")
	);

	// Filter states from nuqs (one per filter config)
	const filterStates: Record<string, string> = {};
	// We can't use hooks in a loop, so we'll read from URL directly for filters
	// and update via a helper

	// Local search for instant typing
	const [localSearch, setLocalSearch] = useState(urlSearch);
	const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	const handleSearch = useCallback(
		(value: string) => {
			setLocalSearch(value);
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
			timerRef.current = setTimeout(() => {
				void setUrlSearch(value || null);
				void setPage(1);
			}, 300);
		},
		[setUrlSearch, setPage]
	);

	// For filters, we need individual nuqs states — but can't use hooks dynamically.
	// Solution: use URLSearchParams to read, setUrlSearch-style setter for each.
	// Actually simplest: just read window.location and use router for filters.
	// BETTER: use a single JSON param for all filters.
	const [filtersParam, setFiltersParam] = useQueryState(
		"f",
		parseAsString.withDefault("")
	);

	const activeFilters: Record<string, string> = (() => {
		if (!filtersParam) {
			return {};
		}
		try {
			return JSON.parse(filtersParam);
		} catch {
			return {};
		}
	})();

	const handleFilter = useCallback(
		(id: string, value: string) => {
			const next = { ...activeFilters };
			if (value === "all") {
				delete next[id];
			} else {
				next[id] = value;
			}
			void setFiltersParam(
				Object.keys(next).length > 0 ? JSON.stringify(next) : null
			);
			void setPage(1);
		},
		[activeFilters, setFiltersParam, setPage]
	);

	const isFiltered = !!urlSearch || Object.keys(activeFilters).length > 0;

	const handleReset = useCallback(() => {
		setLocalSearch("");
		void setUrlSearch(null);
		void setFiltersParam(null);
		void setPage(1);
	}, [setUrlSearch, setFiltersParam, setPage]);

	// Fetch
	const { data: result, isFetching } = useQuery({
		queryKey: [queryKey, page, perPage, urlSearch, filtersParam],
		queryFn: () =>
			queryFn({ page, perPage, search: urlSearch, filters: activeFilters }),
		placeholderData: (prev) => prev,
	});

	const rows = result?.data ?? [];
	const pageCount = result?.pageCount ?? 0;
	const total = result?.total;

	// Table (render only)
	const table = useReactTable({
		data: rows,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div className="flex flex-col gap-4">
			{/* Toolbar */}
			<div className="flex flex-wrap items-center gap-2">
				<div className="relative min-w-[200px] max-w-sm flex-1">
					<Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						className="h-9 pl-9"
						onChange={(e) => handleSearch(e.target.value)}
						placeholder={searchPlaceholder}
						value={localSearch}
					/>
				</div>
				{filters.map((f) => (
					<Select
						key={f.id}
						onValueChange={(v) => handleFilter(f.id, v)}
						value={activeFilters[f.id] ?? "all"}
					>
						<SelectTrigger className="h-9 w-[130px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All {f.label}</SelectItem>
							{f.options.map((o) => (
								<SelectItem key={o.value} value={o.value}>
									{o.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				))}
				{isFiltered && (
					<Button onClick={handleReset} size="sm" variant="ghost">
						<X className="mr-1 size-4" />
						Reset
					</Button>
				)}
				{isFetching && (
					<div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
				)}
			</div>

			{/* Table */}
			<div className="overflow-hidden rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((hg) => (
							<TableRow key={hg.id}>
								{hg.headers.map((h) => (
									<TableHead key={h.id}>
										{h.isPlaceholder
											? null
											: flexRender(h.column.columnDef.header, h.getContext())}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{rows.length === 0 ? (
							<TableRow>
								<TableCell
									className="h-24 text-center text-muted-foreground"
									colSpan={columns.length}
								>
									{isFetching ? "Loading..." : "No results."}
								</TableCell>
							</TableRow>
						) : (
							table.getRowModel().rows.map((row) => (
								<TableRow key={row.id}>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext()
											)}
										</TableCell>
									))}
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			{pageCount > 1 && (
				<div className="flex items-center justify-between">
					<p className="text-muted-foreground text-sm">
						Page {page} of {pageCount}
						{total != null && ` · ${total.toLocaleString()} total`}
					</p>
					<div className="flex items-center gap-1">
						<Button
							className="size-8"
							disabled={page <= 1}
							onClick={() => setPage(1)}
							size="icon"
							variant="outline"
						>
							<ChevronsLeft className="size-4" />
						</Button>
						<Button
							className="size-8"
							disabled={page <= 1}
							onClick={() => setPage(page - 1)}
							size="icon"
							variant="outline"
						>
							<ChevronLeft className="size-4" />
						</Button>
						<Button
							className="size-8"
							disabled={page >= pageCount}
							onClick={() => setPage(page + 1)}
							size="icon"
							variant="outline"
						>
							<ChevronRight className="size-4" />
						</Button>
						<Button
							className="size-8"
							disabled={page >= pageCount}
							onClick={() => setPage(pageCount)}
							size="icon"
							variant="outline"
						>
							<ChevronsRight className="size-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
