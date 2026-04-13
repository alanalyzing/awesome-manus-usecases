import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Plus,
  Minus,
  Loader2,
  Globe,
  GlobeLock,
  Star,
  Sparkles,
  BookOpen,
  X,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export function AdminCollections() {
  const utils = trpc.useUtils();

  // Collections state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [addCollectionId, setAddCollectionId] = useState<number | null>(null);
  const [selectedUseCaseId, setSelectedUseCaseId] = useState<string>("");

  // Featured state
  const [featuredOpen, setFeaturedOpen] = useState(false);
  const [featuredUseCaseId, setFeaturedUseCaseId] = useState<string>("");
  const [featuredBlurb, setFeaturedBlurb] = useState("");

  // Queries
  const collectionsQuery = trpc.admin.listCollections.useQuery();
  const featuredQuery = trpc.admin.getFeatured.useQuery();
  const useCasesQuery = trpc.useCases.list.useQuery({ limit: 100, sort: "popular" });

  // Mutations
  const createMutation = trpc.admin.createCollection.useMutation({
    onSuccess: () => {
      utils.admin.listCollections.invalidate();
      utils.useCases.collections.invalidate();
      setCreateOpen(false);
      setNewTitle("");
      setNewDesc("");
      toast.success("Collection created");
    },
  });

  const updateMutation = trpc.admin.updateCollection.useMutation({
    onSuccess: () => {
      utils.admin.listCollections.invalidate();
      utils.useCases.collections.invalidate();
      setEditOpen(false);
      toast.success("Collection updated");
    },
  });

  const deleteMutation = trpc.admin.deleteCollection.useMutation({
    onSuccess: () => {
      utils.admin.listCollections.invalidate();
      utils.useCases.collections.invalidate();
      toast.success("Collection deleted");
    },
  });

  const addItemMutation = trpc.admin.addToCollection.useMutation({
    onSuccess: () => {
      utils.admin.listCollections.invalidate();
      utils.useCases.collections.invalidate();
      toast.success("Use case added to collection");
    },
  });

  const removeItemMutation = trpc.admin.removeFromCollection.useMutation({
    onSuccess: () => {
      utils.admin.listCollections.invalidate();
      utils.useCases.collections.invalidate();
      toast.success("Use case removed from collection");
    },
  });

  const togglePublishMutation = trpc.admin.updateCollection.useMutation({
    onSuccess: () => {
      utils.admin.listCollections.invalidate();
      utils.useCases.collections.invalidate();
      toast.success("Collection visibility updated");
    },
  });

  const setFeaturedMutation = trpc.admin.setFeatured.useMutation({
    onSuccess: () => {
      utils.admin.getFeatured.invalidate();
      utils.useCases.featured.invalidate();
      setFeaturedOpen(false);
      toast.success("Featured use case updated");
    },
  });

  const removeFeaturedMutation = trpc.admin.removeFeatured.useMutation({
    onSuccess: () => {
      utils.admin.getFeatured.invalidate();
      utils.useCases.featured.invalidate();
      toast.success("Featured use case removed");
    },
  });

  const collections = collectionsQuery.data ?? [];
  const featured = featuredQuery.data;
  const useCasesList = useCasesQuery.data?.items ?? [];

  // Expanded collection details
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const expandedQuery = trpc.useCases.collectionBySlug.useQuery(
    { slug: collections.find(c => c.id === expandedId)?.slug ?? "" },
    { enabled: !!expandedId && !!collections.find(c => c.id === expandedId)?.slug }
  );

  return (
    <div className="space-y-8">
      {/* ═══ Featured Use Case of the Week ═══ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-serif font-semibold flex items-center gap-2">
            <Star size={18} className="text-primary" />
            Featured Use Case of the Week
          </h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
              setFeaturedUseCaseId("");
              setFeaturedBlurb("");
              setFeaturedOpen(true);
            }}>
              <Sparkles size={13} />
              Set Featured
            </Button>
            {featured && (
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-destructive"
                onClick={() => removeFeaturedMutation.mutate()}
                disabled={removeFeaturedMutation.isPending}
              >
                {removeFeaturedMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                Remove
              </Button>
            )}
          </div>
        </div>

        {featured ? (
          <div className="bg-card border rounded-xl p-5">
            <div className="flex items-start gap-4">
              {featured.useCase.screenshots?.[0] && (
                <img
                  src={featured.useCase.screenshots[0].url}
                  alt=""
                  className="w-24 h-16 rounded-lg object-cover border"
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm">{featured.useCase.title}</h4>
                {featured.editorialBlurb && (
                  <p className="text-xs text-muted-foreground mt-1 italic">"{featured.editorialBlurb}"</p>
                )}
                <div className="flex gap-2 mt-2">
                  {featured.useCase.categories?.map((cat: any) => (
                    <Badge key={cat.slug} variant="secondary" className="text-[10px]">{cat.name}</Badge>
                  ))}
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">
                Since {new Date(featured.startDate).toLocaleDateString()}
              </Badge>
            </div>
          </div>
        ) : (
          <div className="bg-card border rounded-xl p-8 text-center text-muted-foreground text-sm">
            No featured use case set. Click "Set Featured" to spotlight a use case on the homepage.
          </div>
        )}
      </section>

      <Separator />

      {/* ═══ Curated Collections ═══ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-serif font-semibold flex items-center gap-2">
            <BookOpen size={18} className="text-primary" />
            Curated Collections
          </h3>
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <FolderPlus size={13} />
            New Collection
          </Button>
        </div>

        {collections.length === 0 ? (
          <div className="bg-card border rounded-xl p-8 text-center text-muted-foreground text-sm">
            No collections yet. Create themed groups of use cases to help users discover the best content.
          </div>
        ) : (
          <div className="space-y-3">
            {collections.map((col) => (
              <div key={col.id} className="bg-card border rounded-xl overflow-hidden">
                <div className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm truncate">{col.title}</h4>
                      <Badge variant={col.isPublished ? "default" : "secondary"} className="text-[10px] shrink-0">
                        {col.isPublished ? (
                          <><Globe size={10} className="mr-1" /> Published</>
                        ) : (
                          <><GlobeLock size={10} className="mr-1" /> Draft</>
                        )}
                      </Badge>
                    </div>
                    {col.description && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{col.description}</p>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {col.useCaseCount} use case{col.useCaseCount !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => setExpandedId(expandedId === col.id ? null : col.id)}
                    >
                      <BookOpen size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setAddCollectionId(col.id);
                        setSelectedUseCaseId("");
                        setAddItemOpen(true);
                      }}
                    >
                      <Plus size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        togglePublishMutation.mutate({
                          id: col.id,
                          isPublished: !col.isPublished,
                        });
                      }}
                    >
                      {col.isPublished ? <GlobeLock size={14} /> : <Globe size={14} />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setEditId(col.id);
                        setEditTitle(col.title);
                        setEditDesc(col.description ?? "");
                        setEditOpen(true);
                      }}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive"
                      onClick={() => {
                        if (confirm("Delete this collection? This cannot be undone.")) {
                          deleteMutation.mutate({ id: col.id });
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                {/* Expanded: show use cases in collection */}
                {expandedId === col.id && (
                  <div className="border-t bg-accent/30 p-4">
                    {expandedQuery.isLoading ? (
                      <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin" /></div>
                    ) : expandedQuery.data?.useCases?.length ? (
                      <div className="space-y-2">
                        {expandedQuery.data.useCases.map((uc: any) => (
                          <div key={uc.id} className="flex items-center gap-3 bg-card rounded-lg p-2.5 border">
                            {uc.screenshots?.[0] && (
                              <img src={uc.screenshots[0].url} alt="" className="w-12 h-8 rounded object-cover" />
                            )}
                            <span className="text-xs font-medium flex-1 truncate">{uc.title}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-destructive"
                              onClick={() => removeItemMutation.mutate({
                                collectionId: col.id,
                                useCaseId: uc.id,
                              })}
                            >
                              <Minus size={12} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        No use cases in this collection yet. Click + to add some.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ═══ Dialogs ═══ */}

      {/* Create Collection */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Collection</DialogTitle>
            <DialogDescription>Create a themed group of use cases.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Title</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Best for Sales Teams"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="A brief description of this collection"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate({ title: newTitle, description: newDesc || undefined })}
              disabled={!newTitle.trim() || createMutation.isPending}
              className="gap-1.5"
            >
              {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Collection */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={() => editId && updateMutation.mutate({ id: editId, title: editTitle, description: editDesc || undefined })}
              disabled={!editTitle.trim() || updateMutation.isPending}
              className="gap-1.5"
            >
              {updateMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Use Case to Collection */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Use Case to Collection</DialogTitle>
            <DialogDescription>Select a use case to add.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select value={selectedUseCaseId} onValueChange={setSelectedUseCaseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a use case..." />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {useCasesList.map((uc: any) => (
                  <SelectItem key={uc.id} value={String(uc.id)}>
                    {uc.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (addCollectionId && selectedUseCaseId) {
                  addItemMutation.mutate({
                    collectionId: addCollectionId,
                    useCaseId: Number(selectedUseCaseId),
                  });
                  setAddItemOpen(false);
                }
              }}
              disabled={!selectedUseCaseId || addItemMutation.isPending}
              className="gap-1.5"
            >
              {addItemMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Featured Use Case */}
      <Dialog open={featuredOpen} onOpenChange={setFeaturedOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Featured Use Case</DialogTitle>
            <DialogDescription>Choose a use case to spotlight on the homepage this week.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Use Case</Label>
              <Select value={featuredUseCaseId} onValueChange={setFeaturedUseCaseId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a use case..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {useCasesList.map((uc: any) => (
                    <SelectItem key={uc.id} value={String(uc.id)}>
                      {uc.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Editorial Blurb (optional)</Label>
              <Input
                value={featuredBlurb}
                onChange={(e) => setFeaturedBlurb(e.target.value)}
                placeholder="Why this use case is special..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeaturedOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (featuredUseCaseId) {
                  setFeaturedMutation.mutate({
                    useCaseId: Number(featuredUseCaseId),
                    editorialBlurb: featuredBlurb || undefined,
                  });
                }
              }}
              disabled={!featuredUseCaseId || setFeaturedMutation.isPending}
              className="gap-1.5"
            >
              {setFeaturedMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Set as Featured
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
