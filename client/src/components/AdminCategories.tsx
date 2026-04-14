import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FolderPlus,
  Pencil,
  Trash2,
  Loader2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Tag,
  Briefcase,
  Cpu,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export function AdminCategories() {
  const utils = trpc.useUtils();

  // State
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newType, setNewType] = useState<"job_function" | "feature">("job_function");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editType, setEditType] = useState<"job_function" | "feature">("job_function");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState("");

  // Queries
  const categoriesQuery = trpc.admin.listCategories.useQuery();
  const categories = categoriesQuery.data ?? [];

  const jobFunctionCats = useMemo(
    () => categories.filter((c) => c.type === "job_function").sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );
  const featureCats = useMemo(
    () => categories.filter((c) => c.type === "feature").sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  // Mutations
  const createMutation = trpc.admin.createCategory.useMutation({
    onSuccess: () => {
      toast.success("Category created");
      utils.admin.listCategories.invalidate();
      utils.categories.list.invalidate();
      setCreateOpen(false);
      setNewName("");
      setNewSlug("");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.admin.updateCategory.useMutation({
    onSuccess: () => {
      toast.success("Category updated");
      utils.admin.listCategories.invalidate();
      utils.categories.list.invalidate();
      setEditOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.admin.deleteCategory.useMutation({
    onSuccess: () => {
      toast.success("Category deleted");
      utils.admin.listCategories.invalidate();
      utils.categories.list.invalidate();
      setDeleteOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const reorderMutation = trpc.admin.reorderCategories.useMutation({
    onSuccess: () => {
      utils.admin.listCategories.invalidate();
      utils.categories.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Auto-generate slug from name
  const generateSlug = (name: string, type: "job_function" | "feature") => {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return type === "job_function" ? base : base;
  };

  // Move category up/down within its type group
  const moveCategory = (catId: number, direction: "up" | "down", catList: typeof categories) => {
    const idx = catList.findIndex((c) => c.id === catId);
    if (idx < 0) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === catList.length - 1) return;

    const newList = [...catList];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [newList[idx], newList[swapIdx]] = [newList[swapIdx], newList[idx]];

    const items = newList.map((c, i) => ({ id: c.id, sortOrder: i }));
    reorderMutation.mutate({ items });
  };

  const openEdit = (cat: typeof categories[0]) => {
    setEditId(cat.id);
    setEditName(cat.name);
    setEditSlug(cat.slug);
    setEditType(cat.type as "job_function" | "feature");
    setEditOpen(true);
  };

  const openDelete = (cat: typeof categories[0]) => {
    setDeleteId(cat.id);
    setDeleteName(cat.name);
    setDeleteOpen(true);
  };

  const renderCategoryList = (catList: typeof categories, typeLabel: string, icon: React.ReactNode) => (
    <div className="bg-card rounded-xl border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif font-bold text-sm flex items-center gap-2">
          {icon}
          {typeLabel} ({catList.length})
        </h3>
      </div>
      {catList.length === 0 ? (
        <p className="text-sm text-muted-foreground">No categories in this group.</p>
      ) : (
        <div className="space-y-1">
          {catList.map((cat, idx) => (
            <div
              key={cat.id}
              className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <GripVertical size={14} className="text-muted-foreground/40 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{cat.name}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                    {cat.slug}
                  </Badge>
                </div>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {(cat as any).count ?? 0} use cases
              </span>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={idx === 0 || reorderMutation.isPending}
                  onClick={() => moveCategory(cat.id, "up", catList)}
                >
                  <ArrowUp size={12} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={idx === catList.length - 1 || reorderMutation.isPending}
                  onClick={() => moveCategory(cat.id, "down", catList)}
                >
                  <ArrowDown size={12} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => openEdit(cat)}
                >
                  <Pencil size={12} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={() => openDelete(cat)}
                >
                  <Trash2 size={12} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag size={16} className="text-primary" />
          <h2 className="font-serif font-bold text-sm">Category Management</h2>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setNewName("");
            setNewSlug("");
            setNewType("job_function");
            setCreateOpen(true);
          }}
        >
          <FolderPlus size={14} />
          Add Category
        </Button>
      </div>

      {/* Job Function Categories */}
      {renderCategoryList(jobFunctionCats, "Job Function / Industry", <Briefcase size={16} className="text-primary" />)}

      {/* Feature Categories */}
      {renderCategoryList(featureCats, "Features", <Cpu size={16} className="text-primary" />)}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>Create a new category for organizing use cases.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setNewSlug(generateSlug(e.target.value, newType));
                }}
                placeholder="e.g. Healthcare"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="e.g. healthcare"
              />
              <p className="text-xs text-muted-foreground">URL-friendly identifier. Auto-generated from name.</p>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="job_function">Job Function / Industry</SelectItem>
                  <SelectItem value="feature">Feature</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!newName.trim() || !newSlug.trim()) {
                  toast.error("Name and slug are required");
                  return;
                }
                const maxSort = (newType === "job_function" ? jobFunctionCats : featureCats).length;
                createMutation.mutate({
                  name: newName.trim(),
                  slug: newSlug.trim(),
                  type: newType,
                  sortOrder: maxSort,
                });
              }}
              disabled={createMutation.isPending}
              className="gap-1.5"
            >
              {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update the category name, slug, or type.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Changing the slug may break existing i18n translations. Update translations accordingly.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={editType} onValueChange={(v) => setEditType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="job_function">Job Function / Industry</SelectItem>
                  <SelectItem value="feature">Feature</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (editId === null || !editName.trim() || !editSlug.trim()) {
                  toast.error("Name and slug are required");
                  return;
                }
                updateMutation.mutate({
                  id: editId,
                  name: editName.trim(),
                  slug: editSlug.trim(),
                  type: editType,
                });
              }}
              disabled={updateMutation.isPending}
              className="gap-1.5"
            >
              {updateMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteName}</strong>? This will remove all use case associations with this category. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteId !== null) deleteMutation.mutate({ id: deleteId });
              }}
              disabled={deleteMutation.isPending}
              className="gap-1.5"
            >
              {deleteMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
