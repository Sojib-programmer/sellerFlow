import { useState } from "react";
import type { Order } from "@/lib/sellerflow-data";
import {
  NewOrderDialog,
  OrderDetailsDialog,
  type Prefill,
} from "@/components/sellerflow/dialogs";

export function useOrderDialogs() {
  const [creating, setCreating] = useState(false);
  const [prefill, setPrefill] = useState<Prefill | undefined>();
  const [selected, setSelected] = useState<Order | null>(null);

  const openCreate = (p?: Prefill) => {
    setPrefill(p);
    setCreating(true);
  };

  const dialogs = (
    <>
      {creating && (
        <NewOrderDialog
          open={creating}
          prefill={prefill}
          onOpenChange={(o) => {
            setCreating(o);
            if (!o) setPrefill(undefined);
          }}
        />
      )}
      <OrderDetailsDialog order={selected} onOpenChange={() => setSelected(null)} />
    </>
  );

  return { dialogs, openCreate, openOrder: setSelected };
}
