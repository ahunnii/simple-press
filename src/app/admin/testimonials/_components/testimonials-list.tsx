// "use client";

// import { useState } from "react";
// import { formatDistanceToNow } from "date-fns";
// import { Eye, EyeOff, MoreVertical, Star, Trash2 } from "lucide-react";
// import { toast } from "sonner";

// import { api } from "~/trpc/react";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "~/components/ui/alert-dialog";
// import { Badge } from "~/components/ui/badge";
// import { Button } from "~/components/ui/button";
// import { Card, CardContent } from "~/components/ui/card";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "~/components/ui/dropdown-menu";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

// type TestimonialsListProps = {
//   businessId: string;
// };

// export function TestimonialsList({ businessId }: TestimonialsListProps) {
//   const [deleteId, setDeleteId] = useState<string | null>(null);

//   const { data: testimonials, refetch } = api.testimonial.list.useQuery({
//     businessId,
//     publicOnly: false,
//   });

//   const togglePublicMutation = api.testimonial.togglePublic.useMutation({
//     onSuccess: () => {
//       toast.success("Testimonial updated");
//       refetch();
//     },
//     onError: (error) => {
//       toast.error(error.message || "Failed to update");
//     },
//   });

//   const deleteMutation = api.testimonial.delete.useMutation({
//     onSuccess: () => {
//       toast.success("Testimonial deleted");
//       setDeleteId(null);
//       refetch();
//     },
//     onError: (error) => {
//       toast.error(error.message || "Failed to delete");
//     },
//   });

//   const publicTestimonials = testimonials?.filter((t) => t.isPublic) || [];
//   const pendingTestimonials = testimonials?.filter((t) => !t.isPublic) || [];

//   const renderStars = (rating: number) => {
//     return (
//       <div className="flex gap-0.5">
//         {[1, 2, 3, 4, 5].map((star) => (
//           <Star
//             key={star}
//             className={`h-4 w-4 ${
//               star <= rating
//                 ? "fill-yellow-400 text-yellow-400"
//                 : "text-gray-300"
//             }`}
//           />
//         ))}
//       </div>
//     );
//   };

//   const renderTestimonial = (testimonial: any) => (
//     <Card key={testimonial.id}>
//       <CardContent className="p-6">
//         <div className="flex items-start justify-between">
//           <div className="min-w-0 flex-1">
//             {/* Header */}
//             <div className="mb-3 flex items-center gap-3">
//               <div>
//                 <p className="font-medium">{testimonial.customerName}</p>
//                 <p className="text-sm text-gray-500">
//                   {testimonial.customerEmail}
//                 </p>
//               </div>
//               {renderStars(testimonial.rating)}
//             </div>

//             {/* Testimonial Text */}
//             <p className="mb-3 text-gray-700">{testimonial.text}</p>

//             {/* Media */}
//             {(testimonial.photoUrl || testimonial.videoUrl) && (
//               <div className="mb-3 flex gap-2">
//                 {testimonial.photoUrl && (
//                   <Badge variant="outline">📷 Photo</Badge>
//                 )}
//                 {testimonial.videoUrl && (
//                   <Badge variant="outline">🎥 Video</Badge>
//                 )}
//               </div>
//             )}

//             {/* Footer */}
//             <div className="flex items-center gap-2 text-xs text-gray-500">
//               <span>
//                 {formatDistanceToNow(new Date(testimonial.createdAt), {
//                   addSuffix: true,
//                 })}
//               </span>
//               {testimonial.isPublic ? (
//                 <Badge variant="default" className="bg-green-600">
//                   Published
//                 </Badge>
//               ) : (
//                 <Badge variant="secondary">Pending Review</Badge>
//               )}
//             </div>
//           </div>

//           {/* Actions */}
//           <DropdownMenu>
//             <DropdownMenuTrigger asChild>
//               <Button variant="ghost" size="sm">
//                 <MoreVertical className="h-4 w-4" />
//               </Button>
//             </DropdownMenuTrigger>
//             <DropdownMenuContent align="end">
//               <DropdownMenuItem
//                 onClick={() =>
//                   togglePublicMutation.mutate({
//                     id: testimonial.id,
//                     isPublic: !testimonial.isPublic,
//                   })
//                 }
//               >
//                 {testimonial.isPublic ? (
//                   <>
//                     <EyeOff className="mr-2 h-4 w-4" />
//                     Hide
//                   </>
//                 ) : (
//                   <>
//                     <Eye className="mr-2 h-4 w-4" />
//                     Publish
//                   </>
//                 )}
//               </DropdownMenuItem>
//               <DropdownMenuItem
//                 onClick={() => setDeleteId(testimonial.id)}
//                 className="text-red-600"
//               >
//                 <Trash2 className="mr-2 h-4 w-4" />
//                 Delete
//               </DropdownMenuItem>
//             </DropdownMenuContent>
//           </DropdownMenu>
//         </div>
//       </CardContent>
//     </Card>
//   );

//   if (!testimonials) {
//     return <div>Loading...</div>;
//   }

//   return (
//     <>
//       <Tabs defaultValue="pending" className="space-y-6">
//         <TabsList>
//           <TabsTrigger value="pending">
//             Pending Review
//             {pendingTestimonials.length > 0 && (
//               <Badge variant="destructive" className="ml-2">
//                 {pendingTestimonials.length}
//               </Badge>
//             )}
//           </TabsTrigger>
//           <TabsTrigger value="published">
//             Published ({publicTestimonials.length})
//           </TabsTrigger>
//           <TabsTrigger value="all">All ({testimonials.length})</TabsTrigger>
//         </TabsList>

//         <TabsContent value="pending" className="space-y-4">
//           {pendingTestimonials.length === 0 ? (
//             <Card>
//               <CardContent className="py-12 text-center text-gray-500">
//                 <p>No pending testimonials</p>
//               </CardContent>
//             </Card>
//           ) : (
//             pendingTestimonials.map(renderTestimonial)
//           )}
//         </TabsContent>

//         <TabsContent value="published" className="space-y-4">
//           {publicTestimonials.length === 0 ? (
//             <Card>
//               <CardContent className="py-12 text-center text-gray-500">
//                 <p>No published testimonials yet</p>
//               </CardContent>
//             </Card>
//           ) : (
//             publicTestimonials.map(renderTestimonial)
//           )}
//         </TabsContent>

//         <TabsContent value="all" className="space-y-4">
//           {testimonials.map(renderTestimonial)}
//         </TabsContent>
//       </Tabs>

//       {/* Delete Confirmation */}
//       <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>Delete Testimonial?</AlertDialogTitle>
//             <AlertDialogDescription>
//               This will permanently delete this testimonial. This action cannot
//               be undone.
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel>Cancel</AlertDialogCancel>
//             <AlertDialogAction
//               onClick={() =>
//                 deleteId && deleteMutation.mutate({ id: deleteId })
//               }
//               className="bg-red-600 hover:bg-red-700"
//             >
//               Delete
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
//     </>
//   );
// }

"use client";

import type { Testimonial } from "generated/prisma";
import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Eye,
  EyeOff,
  MoreVertical,
  Pencil,
  Star,
  Trash2,
  UserCheck,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

import { OwnerTestimonialDialog } from "./owner-testimonial-dialog";

export function TestimonialsList({ businessId }: { businessId: string }) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingTestimonial, setEditingTestimonial] =
    useState<Testimonial | null>(null);

  const { data: testimonials, refetch } = api.testimonial.list.useQuery({
    businessId,
    publicOnly: false,
  });

  const togglePublicMutation = api.testimonial.togglePublic.useMutation({
    onSuccess: () => {
      toast.success("Updated");
      void refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = api.testimonial.delete.useMutation({
    onSuccess: () => {
      toast.success("Deleted");
      setDeleteId(null);
      void refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const ownerCreated = testimonials?.filter((t) => t.source === "owner") ?? [];
  const customerSubmitted =
    testimonials?.filter((t) => t.source === "customer") ?? [];
  const pendingApproval = customerSubmitted.filter((t) => !t.isPublic);

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );

  const renderTestimonial = (testimonial: Testimonial) => (
    <Card key={testimonial.id}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {/* Header row */}
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {renderStars(testimonial.rating)}

              {/* Source badge */}
              {testimonial.source === "owner" ? (
                <Badge variant="outline" className="gap-1 text-xs">
                  <UserCog className="h-3 w-3" />
                  Owner Added
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-xs">
                  <UserCheck className="h-3 w-3" />
                  Customer Submitted
                </Badge>
              )}

              {/* Visibility badge */}
              {testimonial.isPublic ? (
                <Badge className="bg-green-600 text-xs">Published</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  {testimonial.source === "customer"
                    ? "Pending Review"
                    : "Hidden"}
                </Badge>
              )}
            </div>

            {/* Title (if present) */}
            {testimonial.title && (
              <p className="mb-1 text-sm font-semibold">{testimonial.title}</p>
            )}

            {/* Text */}
            <p className="mb-3 text-sm text-gray-700">{testimonial.text}</p>

            {/* Attribution */}
            <div className="text-sm">
              <span className="font-medium">{testimonial.customerName}</span>
              {testimonial.customerTitle && (
                <span className="text-gray-500">
                  , {testimonial.customerTitle}
                </span>
              )}
              {testimonial.customerCompany && (
                <span className="text-gray-500">
                  {" "}
                  at {testimonial.customerCompany}
                </span>
              )}
              {testimonial.customerEmail && (
                <span className="ml-2 text-xs text-gray-400">
                  ({testimonial.customerEmail})
                </span>
              )}
            </div>

            {/* Date */}
            <p className="mt-1 text-xs text-gray-400">
              {testimonial.source === "owner"
                ? format(new Date(testimonial.testimonialDate), "MMM d, yyyy")
                : formatDistanceToNow(new Date(testimonial.createdAt), {
                    addSuffix: true,
                  })}
            </p>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Edit — only for owner-created */}
              {testimonial.source === "owner" && (
                <>
                  <DropdownMenuItem
                    onClick={() => setEditingTestimonial(testimonial)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuItem
                onClick={() =>
                  togglePublicMutation.mutate({
                    id: testimonial.id,
                    isPublic: !testimonial.isPublic,
                  })
                }
              >
                {testimonial.isPublic ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Publish
                  </>
                )}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => setDeleteId(testimonial.id)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <Card>
      <CardContent className="py-12 text-center text-gray-500">
        <p>{message}</p>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending
            {pendingApproval.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingApproval.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="customer">
            Customer Submitted ({customerSubmitted.length})
          </TabsTrigger>
          <TabsTrigger value="owner">
            Owner Added ({ownerCreated.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({testimonials?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6 space-y-4">
          {pendingApproval.length === 0 ? (
            <EmptyState message="No pending testimonials" />
          ) : (
            pendingApproval.map(renderTestimonial)
          )}
        </TabsContent>

        <TabsContent value="customer" className="mt-6 space-y-4">
          {customerSubmitted.length === 0 ? (
            <EmptyState message="No customer-submitted testimonials yet" />
          ) : (
            customerSubmitted.map(renderTestimonial)
          )}
        </TabsContent>

        <TabsContent value="owner" className="mt-6 space-y-4">
          {ownerCreated.length === 0 ? (
            <EmptyState message="No owner-added testimonials yet" />
          ) : (
            ownerCreated.map(renderTestimonial)
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-6 space-y-4">
          {(testimonials ?? []).map(renderTestimonial)}
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      {editingTestimonial && (
        <OwnerTestimonialDialog
          businessId={businessId}
          testimonial={editingTestimonial}
          isOpen={true}
          onClose={() => setEditingTestimonial(null)}
          onSuccess={() => {
            void refetch();
            setEditingTestimonial(null);
          }}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Testimonial?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this testimonial and cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteId && deleteMutation.mutate({ id: deleteId })
              }
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
