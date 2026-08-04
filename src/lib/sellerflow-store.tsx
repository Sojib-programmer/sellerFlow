import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, type ReactNode } from "react";
import {
  createOrder as createOrderFn,
  getWorkspace,
  loadDemoData as loadDemoDataFn,
  renameStore as renameStoreFn,
  updateOrder as updateOrderFn,
  upsertProduct as upsertProductFn,
  type CustomerInfo,
  type StoreInfo,
} from "./sellerflow.functions";
import type { Channel, Order, OrderStatus, Product } from "./sellerflow-data";

export type NewOrderDraft = {
  name: string;
  phone: string;
  address: string;
  district: string;
  channel: Channel;
  productSku: string;
  qty: number;
  courier: string;
  payment: "COD" | "Prepaid";
  trackingNumber?: string;
};

export const workspaceQueryKey = ["workspace"] as const;

/**
 * The provider is kept as a passthrough so the root layout and page imports stay
 * unchanged; all state now lives in TanStack Query against Supabase.
 */
export function SellerFlowProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export type SellerFlowValue = {
  store: StoreInfo | null;
  orders: Order[];
  products: Product[];
  customers: CustomerInfo[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  isOwner: boolean;
  createOrder: (draft: NewOrderDraft) => Promise<string>;
  updateStatus: (orderNumber: string, status: OrderStatus) => Promise<void>;
  updateShipping: (
    orderNumber: string,
    patch: { courier?: string; trackingNumber?: string },
  ) => Promise<void>;
  saveProduct: (input: {
    name: string;
    sku: string;
    price: number;
    stock: number;
  }) => Promise<void>;
  renameStore: (name: string) => Promise<void>;
  loadDemoData: () => Promise<{ orders: number; products: number }>;
  isMutating: boolean;
};

export function useSellerFlow(): SellerFlowValue {
  const queryClient = useQueryClient();
  const fetchWorkspace = useServerFn(getWorkspace);
  const createOrderCall = useServerFn(createOrderFn);
  const updateOrderCall = useServerFn(updateOrderFn);
  const upsertProductCall = useServerFn(upsertProductFn);
  const renameStoreCall = useServerFn(renameStoreFn);
  const loadDemoCall = useServerFn(loadDemoDataFn);

  const query = useQuery({
    queryKey: workspaceQueryKey,
    queryFn: () => fetchWorkspace(),
    staleTime: 15_000,
  });

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: workspaceQueryKey }),
    [queryClient],
  );

  const createMutation = useMutation({
    mutationFn: (draft: NewOrderDraft) => createOrderCall({ data: draft }),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: (input: {
      orderNumber: string;
      status?: OrderStatus;
      courier?: string;
      trackingNumber?: string;
    }) => updateOrderCall({ data: input }),
    onSuccess: invalidate,
  });

  const productMutation = useMutation({
    mutationFn: (input: { name: string; sku: string; price: number; stock: number }) =>
      upsertProductCall({ data: input }),
    onSuccess: invalidate,
  });

  const renameMutation = useMutation({
    mutationFn: (name: string) => renameStoreCall({ data: { name } }),
    onSuccess: invalidate,
  });

  const demoMutation = useMutation({
    mutationFn: () => loadDemoCall(),
    onSuccess: invalidate,
  });

  const data = query.data;

  return {
    store: data?.store ?? null,
    orders: data?.orders ?? [],
    products: data?.products ?? [],
    customers: data?.customers ?? [],
    isLoading: query.isPending,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
    refetch: () => void query.refetch(),
    isOwner: data?.store?.role === "owner",
    createOrder: async (draft) => {
      const result = await createMutation.mutateAsync(draft);
      return result.orderNumber;
    },
    updateStatus: async (orderNumber, status) => {
      await updateMutation.mutateAsync({ orderNumber, status });
    },
    updateShipping: async (orderNumber, patch) => {
      await updateMutation.mutateAsync({ orderNumber, ...patch });
    },
    saveProduct: async (input) => {
      await productMutation.mutateAsync(input);
    },
    renameStore: async (name) => {
      await renameMutation.mutateAsync(name);
    },
    loadDemoData: () => demoMutation.mutateAsync(),
    isMutating:
      createMutation.isPending ||
      updateMutation.isPending ||
      productMutation.isPending ||
      renameMutation.isPending ||
      demoMutation.isPending,
  };
}
