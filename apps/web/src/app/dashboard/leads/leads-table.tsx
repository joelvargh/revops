"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, Mail, Search, User } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { orpc } from "@/lib/orpc";

export function LeadsTable() {
	const [search, setSearch] = useState("");
	const [state, setState] = useState<string>("");
	const [industry, setIndustry] = useState<string>("");
	const [page, setPage] = useState(1);

	const { data: filterOptions } = useQuery(
		orpc.leads.filterOptions.queryOptions({})
	);

	const { data, isLoading } = useQuery(
		orpc.leads.list.queryOptions({
			input: {
				page,
				perPage: 20,
				search: search || undefined,
				state: state || undefined,
				industry: industry || undefined,
			},
		})
	);

	const { data: stats } = useQuery(orpc.leads.stats.queryOptions({}));

	return (
		<div className="space-y-4">
			{/* Stats */}
			{stats && (
				<div className="flex gap-3 text-sm">
					<Badge variant="outline">{stats.total} total</Badge>
					<Badge className="bg-green-500/10 text-green-600" variant="outline">
						{stats.qualified} qualified
					</Badge>
					<Badge className="bg-blue-500/10 text-blue-600" variant="outline">
						{stats.approved} approved
					</Badge>
					<Badge className="bg-purple-500/10 text-purple-600" variant="outline">
						{stats.contactAcquired} contacts
					</Badge>
					<Badge variant="default">{stats.ready} ready</Badge>
				</div>
			)}

			{/* Filters */}
			<div className="flex flex-wrap gap-3">
				<div className="relative min-w-[200px] flex-1">
					<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						className="pl-9"
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
						placeholder="Search companies, domains, cities..."
						value={search}
					/>
				</div>
				<Select
					onValueChange={(v) => {
						setState(v === "all" ? "" : v);
						setPage(1);
					}}
					value={state}
				>
					<SelectTrigger className="w-[140px]">
						<SelectValue placeholder="State" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All states</SelectItem>
						{(filterOptions?.states ?? []).map((s) => (
							<SelectItem key={s} value={s}>
								{s}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select
					onValueChange={(v) => {
						setIndustry(v === "all" ? "" : v);
						setPage(1);
					}}
					value={industry}
				>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="Industry" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All industries</SelectItem>
						{(filterOptions?.industries ?? []).map((i) => (
							<SelectItem key={i} value={i}>
								{i}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{(search || state || industry) && (
					<Button
						onClick={() => {
							setSearch("");
							setState("");
							setIndustry("");
							setPage(1);
						}}
						size="sm"
						variant="ghost"
					>
						Clear filters
					</Button>
				)}
			</div>

			{/* Results */}
			{isLoading ? (
				<p className="py-8 text-center text-muted-foreground">
					Loading leads...
				</p>
			) : (
				<>
					<div className="grid gap-3">
						{data?.companies.map((company) => (
							<Card key={company.id}>
								<CardContent className="flex items-center gap-4 py-3">
									{/* Score */}
									<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 font-bold text-lg text-primary">
										{company.scoreTotal ?? "—"}
									</div>

									{/* Company info */}
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<span className="truncate font-medium">
												{company.name}
											</span>
											<Badge className="text-xs" variant="outline">
												{company.status}
											</Badge>
										</div>
										<div className="mt-0.5 flex items-center gap-3 text-muted-foreground text-xs">
											{company.industry && (
												<span className="flex items-center gap-1">
													<Building2 className="h-3 w-3" />
													{company.industry}
												</span>
											)}
											{company.city && (
												<span>
													{company.city}, {company.state}
												</span>
											)}
											{company.employeeCount && (
												<span>👥 {company.employeeCount.toLocaleString()}</span>
											)}
											{company.revenueMm && (
												<span>💰 ${company.revenueMm}M</span>
											)}
										</div>
									</div>

									{/* Contacts */}
									<div className="flex min-w-[250px] flex-col gap-1 text-xs">
										{company.contacts.length > 0 ? (
											company.contacts.map((contact) => (
												<div
													className="flex items-center gap-2"
													key={contact.id}
												>
													<User className="h-3 w-3 text-muted-foreground" />
													<span className="font-medium">
														{contact.firstName} {contact.lastName}
													</span>
													<span className="text-muted-foreground">
														• {contact.title}
													</span>
													{contact.email && (
														<a
															className="flex items-center gap-0.5 text-primary hover:underline"
															href={`mailto:${contact.email}`}
														>
															<Mail className="h-3 w-3" />
															{contact.email}
														</a>
													)}
												</div>
											))
										) : (
											<span className="text-muted-foreground italic">
												No contacts yet
											</span>
										)}
									</div>
								</CardContent>
							</Card>
						))}
					</div>

					{data?.companies.length === 0 && (
						<p className="py-12 text-center text-muted-foreground">
							No leads match your filters.
						</p>
					)}

					{/* Pagination */}
					{data && data.pageCount > 1 && (
						<div className="flex items-center justify-between pt-2">
							<span className="text-muted-foreground text-sm">
								{data.total} results
							</span>
							<div className="flex gap-2">
								<Button
									disabled={page <= 1}
									onClick={() => setPage(page - 1)}
									size="sm"
									variant="outline"
								>
									Previous
								</Button>
								<span className="flex items-center px-2 text-sm">
									{page} / {data.pageCount}
								</span>
								<Button
									disabled={page >= data.pageCount}
									onClick={() => setPage(page + 1)}
									size="sm"
									variant="outline"
								>
									Next
								</Button>
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}
