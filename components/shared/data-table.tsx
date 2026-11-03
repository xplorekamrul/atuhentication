"use client";

import React, { ReactNode, useState, useEffect, useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Pagination } from "@/components/shared/Pagination";
import { cn } from "@/lib/utils";
import { GripVertical, GripHorizontal,  ArrowUpNarrowWide, ArrowDownNarrowWide } from "lucide-react";
export type ColumnDef<T> = {
  header: ReactNode;
  accessorKey?: keyof T;
  cell?: (item: T, index: number) => ReactNode;
  headerTooltip?: string;
  cellTooltip?: (item: T, index: number) => string | undefined;
  className?: string; // e.g., for custom width or alignment
  headerClassName?: string;
  cellClassName?: string;
  colSpan?: (item: T, index: number) => number;
  rowSpan?: (item: T, index: number) => number;
  sortable?: boolean;
};

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  pagination?: {
    page: number;
    total: number;
    pageSize?: number;
    defaultPageSize?: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    pageSizeOptions?: number[];
  };
  className?: string;
  theadClassName?: string;
  footer?: ReactNode;
  rowClassName?: (item: T, index: number) => string;
  enableColumnResizing?: boolean;
  enableRowResizing?: boolean;
  enableColumnOrdering?: boolean;
  enableRowOrdering?: boolean;
  onRowOrderChange?: (newData: T[]) => void;
  tableId?: string; // Important for saving resize state to localStorage
  onSortChange?: (sortConfig: { key: string, direction: "asc" | "desc" } | null) => void;
  showTotalCount?: boolean;
  striped?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  emptyMessage = "No results found.",
  pagination,
  className,
  theadClassName,
  footer,
  rowClassName,
  enableColumnResizing = false,
  enableRowResizing = false,
  enableColumnOrdering = false,
  enableRowOrdering = false,
  onRowOrderChange,
  tableId,
  onSortChange,
  showTotalCount = true,
  striped = true,
}: DataTableProps<T>) {
  const effectivePageSize = pagination?.pageSize ?? pagination?.defaultPageSize ?? 10;
  const pageSizeOptions = useMemo(() => {
    const baseOptions = pagination?.pageSizeOptions || [10, 20, 50, 100];
    if (effectivePageSize && !baseOptions.includes(effectivePageSize)) {
      return [...baseOptions, effectivePageSize].sort((a, b) => a - b);
    }
    return baseOptions;
  }, [pagination?.pageSizeOptions, effectivePageSize]);
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: "asc" | "desc" } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (tableId) {
      try {
        const savedCols = localStorage.getItem(`table-cols-${tableId}`);
        if (savedCols) setColWidths(JSON.parse(savedCols));
        const savedRows = localStorage.getItem(`table-rows-${tableId}`);
        if (savedRows) setRowHeights(JSON.parse(savedRows));
        const savedOrder = localStorage.getItem(`table-col-order-${tableId}`);
        if (savedOrder) setColumnOrder(JSON.parse(savedOrder));
      } catch (e) {
        console.warn("Failed to load table resize/order states");
      }
    }
  }, [tableId]);

  const getColId = (col: ColumnDef<T>, idx: number) => (col.accessorKey as string) || `col-${idx}`;

  const columnsWithId = React.useMemo(() => {
    return columns.map((col, idx) => ({ ...col, originalIndex: idx, id: getColId(col, idx) }));
  }, [columns]);

  const orderedColumns = React.useMemo(() => {
    if (!isMounted || !columnOrder.length) return columnsWithId;
    return [...columnsWithId].sort((a, b) => {
      const idxA = columnOrder.indexOf(a.id);
      const idxB = columnOrder.indexOf(b.id);
      if (idxA === -1 && idxB === -1) return a.originalIndex - b.originalIndex;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }, [columnsWithId, columnOrder, isMounted]);

  const sortedData = React.useMemo(() => {
    if (!sortConfig) return data;
    return [...data].sort((a, b) => {
      const valA = a[sortConfig.key as keyof T];
      const valB = b[sortConfig.key as keyof T];
      if (valA === valB) return 0;
      const comparison = valA < valB ? -1 : 1;
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  const handleSort = (colId: string, accessorKey?: keyof T) => {
    if (!accessorKey) return;
    const key = String(accessorKey);
    let newConfig: { key: string, direction: "asc" | "desc" } | null = null;
    
    if (sortConfig?.key === key) {
      if (sortConfig.direction === "asc") {
        newConfig = { key, direction: "desc" };
      } else {
        newConfig = null;
      }
    } else {
      newConfig = { key, direction: "asc" };
    }
    
    setSortConfig(newConfig);
    
    // Notify parent if callback provided
    if (onSortChange) {
      onSortChange(newConfig);
    }
  };

  const handleColResize = (e: React.PointerEvent, colId: string) => {
    if (!enableColumnResizing) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const th = (e.target as HTMLElement).closest("th");
    const startWidth = th ? th.getBoundingClientRect().width : colWidths[colId] || 100;

    const onMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      setColWidths((prev) => ({ ...prev, [colId]: Math.max(50, startWidth + delta) }));
    };

    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      setColWidths((prev) => {
        if (tableId) localStorage.setItem(`table-cols-${tableId}`, JSON.stringify(prev));
        return prev;
      });
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  const handleRowResize = (e: React.PointerEvent, rowId: string) => {
    if (!enableRowResizing) return;
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const tr = (e.target as HTMLElement).closest("tr");
    const startHeight = tr ? tr.getBoundingClientRect().height : rowHeights[rowId] || 40;

    const onMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientY - startY;
      setRowHeights((prev) => ({ ...prev, [rowId]: Math.max(30, startHeight + delta) }));
    };

    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      setRowHeights((prev) => {
        if (tableId) localStorage.setItem(`table-rows-${tableId}`, JSON.stringify(prev));
        return prev;
      });
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  const handleDragStart = (e: React.DragEvent, colId: string) => {
    if (!enableColumnOrdering) return;
    setDraggedColId(colId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", colId);

    // Hide the default browser ghost image
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!enableColumnOrdering) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e: React.DragEvent, targetColId: string) => {
    if (!enableColumnOrdering || !draggedColId || draggedColId === targetColId) return;
    e.preventDefault();

    setColumnOrder((prevOrder) => {
      const currentOrder = prevOrder.length ? prevOrder : columnsWithId.map(c => c.id);
      const draggedIdx = currentOrder.indexOf(draggedColId);
      const targetIdx = currentOrder.indexOf(targetColId);
      
      if (draggedIdx === -1 || targetIdx === -1) return prevOrder;

      const newOrder = [...currentOrder];
      newOrder.splice(draggedIdx, 1);
      newOrder.splice(targetIdx, 0, draggedColId);
      
      if (tableId) {
        localStorage.setItem(`table-col-order-${tableId}`, JSON.stringify(newOrder));
      }
      return newOrder;
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!enableColumnOrdering) return;
    e.preventDefault();
    setDraggedColId(null);
  };

  const handleDragEnd = () => {
    setDraggedColId(null);
  };

  const handleRowDragStart = (e: React.DragEvent, rowId: string) => {
    if (!enableRowOrdering) return;
    setDraggedRowId(rowId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", rowId);
  };

  const handleRowDragOver = (e: React.DragEvent) => {
    if (!enableRowOrdering) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleRowDragEnter = (e: React.DragEvent, targetRowId: string) => {
    if (!enableRowOrdering || !draggedRowId || draggedRowId === targetRowId) return;
    e.preventDefault();

    const currentData = sortConfig ? [...sortedData] : [...data];
    const draggedIdx = currentData.findIndex(item => keyExtractor(item) === draggedRowId);
    const targetIdx = currentData.findIndex(item => keyExtractor(item) === targetRowId);

    if (draggedIdx === -1 || targetIdx === -1) return;

    const [draggedItem] = currentData.splice(draggedIdx, 1);
    currentData.splice(targetIdx, 0, draggedItem);

    if (onRowOrderChange) {
      onRowOrderChange(currentData);
    }
  };

  const handleRowDrop = (e: React.DragEvent) => {
    if (!enableRowOrdering) return;
    e.preventDefault();
    setDraggedRowId(null);
  };

  const handleRowDragEnd = () => {
    if (!enableRowOrdering) return;
    setDraggedRowId(null);
  };

  return (
    <div className={cn("bg-card border transition-colors duration-300 rounded-lg overflow-hidden shadow-md flex flex-col flex-1 min-h-0 dark:border-foreground dark:border-dashed dark:hover:border-solid dark:shadow-md shadow-foreground/20 dark:[&_tbody]:divide-border! dark:[&_tbody_tr.animate-pulse:nth-child(odd)]:bg-card! dark:[&_tbody_tr.animate-pulse:nth-child(even)]:bg-muted/30!", className)}>
      <div className="overflow-auto flex-1 w-full">
        <TooltipProvider>
          <table className={cn("w-full min-w-200 md:min-w-max text-sm text-left relative border-collapse", enableColumnResizing && "table-fixed")}>
            <thead className={cn("bg-muted/80 border-b text-foreground sticky top-0 z-20 shadow-sm", theadClassName)}>
              <tr>
                {orderedColumns.map((col) => {
                  const cId = col.id;
                  const w = isMounted && colWidths[cId] ? colWidths[cId] : undefined;
                  return (
                    <th 
                      key={cId} 
                      className={cn(
                        "px-2 py-2 font-semibold relative group/th align-middle whitespace-nowrap overflow-hidden text-ellipsis",
                        col.className, 
                        col.headerClassName,
                        enableColumnOrdering && "cursor-grab active:cursor-grabbing",
                        draggedColId === cId && "opacity-40 bg-primary/10"
                      )}
                      style={w ? { width: w } : {}}
                      draggable={enableColumnOrdering}
                      onDragStart={(e) => handleDragStart(e, cId)}
                      onDragOver={handleDragOver}
                      onDragEnter={(e) => handleDragEnter(e, cId)}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                    >
                      {(() => {
                        const isSortable = col.sortable && col.accessorKey;
                        const showTooltip = col.headerTooltip || isSortable;
                        const isSorted = isSortable && sortConfig?.key === String(col.accessorKey);
                        const sortDir = isSorted ? sortConfig.direction : null;

                        const handleHeaderClick = () => {
                          if (isSortable) handleSort(cId, col.accessorKey);
                        };

                        const headerContent = (
                          <span className="inline-flex items-center gap-1">
                            {col.header}
                            {isSorted && (
                              <span className="text-primary shrink-0">
                                {sortDir === "asc" ? <ArrowUpNarrowWide className="h-3 w-3" /> : <ArrowDownNarrowWide className="h-3 w-3" />}
                              </span>
                            )}
                          </span>
                        );

                        if (showTooltip) {
                          return (
                            <Tooltip>
                              <TooltipTrigger 
                                onClick={handleHeaderClick}
                                className={cn(
                                  "underline decoration-dotted underline-offset-2 w-max max-w-full", 
                                  isSortable ? "cursor-pointer" : "cursor-help"
                                )}
                              >
                                {headerContent}
                              </TooltipTrigger>
                              <TooltipContent>
                                <ul className="list-disc pl-4 text-xs space-y-1">
                                  {col.headerTooltip && <li>{col.headerTooltip}</li>}
                                  {isSortable && <li>Click to sort (Ascending, Descending, Default)</li>}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          );
                        }

                        return (
                          <span 
                            onClick={handleHeaderClick}
                            className={cn("w-max max-w-full", isSortable && "cursor-pointer hover:text-primary transition-colors")}
                          >
                            {headerContent}
                          </span>
                        );
                      })()}
                      {enableColumnResizing && (
                        <div
                          onPointerDown={(e) => handleColResize(e, cId)}
                          className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-foreground/60 opacity-0 group-hover/th:opacity-100 flex items-center justify-center z-10 transition-opacity select-none"
                        >
                          <GripVertical className="h-4 w-4 text-foreground" />
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                Array.from({ length: effectivePageSize }).map((_, rowIndex) => (
                  <tr key={`skeleton-${rowIndex}`} className={cn("border-t border-border animate-pulse bg-background", striped && "odd:bg-background even:bg-primary/10")}>
                    {orderedColumns.map((col) => (
                      <td key={col.id} className={`px-2 py-3 ${col.className || ""} ${col.cellClassName || ""}`}>
                        <div className="h-5 bg-muted rounded w-full max-w-[80%] opacity-50"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : sortedData.length === 0 ? (
                <tr>
                  <td colSpan={orderedColumns.length} className="px-6 py-8 text-center text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                (() => {
                  const activeRowSpans: Record<string, number> = {};
                  return sortedData.map((item, rowIdx) => {
                    let skipColumns = 0;
                    const rowId = keyExtractor(item);
                  const h = isMounted && rowHeights[rowId] ? rowHeights[rowId] : undefined;
                  
                  return (
                  <tr 
                    key={rowId} 
                    className={cn(
                      "relative transition-all duration-300 ease-in-out group/tr bg-background", 
                      striped && "odd:bg-background even:bg-primary/5 dark:odd:bg-card! dark:even:bg-muted/20!", 
                      draggedRowId === rowId 
                        ? "opacity-60 bg-muted border-y-2 border-primary border-dashed shadow-[inset_0_0_15px_rgba(0,0,0,0.1)] z-10" 
                        : "hover:bg-primary/10 dark:hover:bg-muted/50!",
                      enableRowOrdering && "cursor-grab active:cursor-grabbing",
                      rowClassName?.(item, rowIdx)
                    )}
                    style={h ? { height: h } : {}}
                    draggable={enableRowOrdering}
                    onDragStart={enableRowOrdering ? (e) => handleRowDragStart(e, rowId) : undefined}
                    onDragOver={enableRowOrdering ? handleRowDragOver : undefined}
                    onDragEnter={enableRowOrdering ? (e) => handleRowDragEnter(e, rowId) : undefined}
                    onDrop={enableRowOrdering ? handleRowDrop : undefined}
                    onDragEnd={enableRowOrdering ? handleRowDragEnd : undefined}
                  >
                    {orderedColumns.map((col, colIdx) => {
                      if (activeRowSpans[col.id] > 0) {
                        activeRowSpans[col.id]--;
                        return null;
                      }
                      if (skipColumns > 0) {
                        skipColumns--;
                        return null;
                      }

                      const cellContent = col.cell
                        ? col.cell(item, rowIdx)
                        : col.accessorKey
                        ? (item[col.accessorKey] as ReactNode)
                        : null;

                      const tooltipContent = col.cellTooltip ? col.cellTooltip(item, rowIdx) : undefined;
                      const colSpan = col.colSpan ? col.colSpan(item, rowIdx) : 1;
                      const rowSpan = col.rowSpan ? col.rowSpan(item, rowIdx) : 1;

                      if (colSpan > 1) {
                         skipColumns = colSpan - 1;
                      }
                      if (rowSpan > 1) {
                         activeRowSpans[col.id] = rowSpan - 1;
                      }

                      return (
                        <td key={col.id} rowSpan={rowSpan > 1 ? rowSpan : undefined} colSpan={colSpan > 1 ? colSpan : undefined} className={cn("px-2 py-1 align-middle whitespace-nowrap overflow-hidden text-ellipsis", colIdx === 0 ? "relative pl-6" : "relative", col.className, col.cellClassName)}>
                          {enableRowOrdering && colIdx === 0 && (
                            <div className="absolute left-1 top-1/2 -translate-y-1/2 text-muted-foreground/30 group-hover/tr:text-muted-foreground hover:text-foreground! cursor-grab active:cursor-grabbing transition-colors">
                              <GripVertical className="h-4 w-4" />
                            </div>
                          )}
                          {tooltipContent ? (
                            <Tooltip>
                              <TooltipTrigger className="cursor-help">
                                {cellContent}
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{tooltipContent}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            cellContent
                          )}
                          {enableRowResizing && colIdx === 0 && (
                            <div
                              onPointerDown={(e) => handleRowResize(e, rowId)}
                              className="absolute bottom-0 left-0 right-0 h-0.5 cursor-row-resize hover:bg-foreground opacity-0 group-hover/tr:opacity-100 z-10 transition-opacity select-none"
                            >
                              <div className="sticky left-1/2 w-max -translate-x-1/2 pointer-events-none flex items-center justify-center h-full">
                                <GripHorizontal className="h-3 w-3 text-foreground pointer-events-none" />
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  );
                });
              })()
              )}
            </tbody>
            {footer && (
              <tfoot className="border-t bg-muted/50 font-medium">
                {footer}
              </tfoot>
            )}
          </table>
        </TooltipProvider>
      </div>
      
      {/* Footer / Pagination */}
      {(showTotalCount || (pagination && (pagination.total > effectivePageSize || pagination.onPageSizeChange))) && (
        <div className="px-4 py-3 border-t bg-muted/20 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
          {showTotalCount ? (
            <div className="text-sm text-muted-foreground whitespace-nowrap flex items-center gap-3 flex-wrap">
              {pagination ? (
                pagination.total <= effectivePageSize ? (
                  <>
                    Total <span className="font-medium text-foreground">{pagination.total}</span> {pagination.total === 1 ? "entry" : "entries"}
                  </>
                ) : (
                  <>
                    Showing <span className="font-medium text-foreground">{(pagination.page - 1) * effectivePageSize + (pagination.total === 0 ? 0 : 1)}</span> -{" "}
                    <span className="font-medium text-foreground">{Math.min(pagination.page * effectivePageSize, pagination.total)}</span> of{" "}
                    <span className="font-medium text-foreground">{pagination.total}</span>
                  </>
                )
              ) : (
                <>
                  Total <span className="font-medium text-foreground">{data.length}</span> {data.length === 1 ? "entry" : "entries"}
                </>
              )}
            </div>
          ) : null}
          
          {pagination && (pagination.total > effectivePageSize || pagination.onPageSizeChange) && (
            <div className="shrink-0 order-2 sm:order-2 ml-auto">
              <Pagination 
                page={pagination.page}
                total={pagination.total}
                pageSize={effectivePageSize}
                defaultPageSize={effectivePageSize}
                onPageChange={pagination.onPageChange}
                onPageSizeChange={pagination.onPageSizeChange}
                pageSizeOptions={pageSizeOptions}
                showTotalText={false}
                showPageSize={Boolean(pagination.onPageSizeChange)}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
