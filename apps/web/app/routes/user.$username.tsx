import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { MemoCard } from "~/components/memo-card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Skeleton } from "~/components/ui/skeleton";
import { useTimeline } from "~/hooks/queries/use-timeline";
import { useUserProfile } from "~/hooks/queries/use-user-profile";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/user.$username";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `${params.username} - Nodal` },
    { name: "description", content: "User profile timeline" },
  ];
}

export default function UserProfileRoute({ params }: Route.ComponentProps) {
  const username = params.username;
  const { t } = useTranslation();
  const { data: profile, status: profileStatus } = useUserProfile(username);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useTimeline({ username });
  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const displayName = profile?.displayName || profile?.username || username;

  return (
    <div className="pb-20">
      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card mb-6">
        <div
          className="h-36 md:h-44 bg-gradient-to-r from-slate-200 via-zinc-100 to-slate-300 dark:from-slate-800 dark:via-zinc-900 dark:to-slate-700"
          style={
            profile?.coverImageUrl
              ? {
                  backgroundImage: `url(${profile.coverImageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        />

        <div className="px-4 md:px-6 pb-5">
          <div className="-mt-10 mb-3">
            <Avatar className="h-20 w-20 border-4 border-card shadow-sm">
              <AvatarImage src={profile?.avatarUrl} />
              <AvatarFallback>
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {profileStatus === "pending" ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-full max-w-lg" />
            </div>
          ) : profileStatus === "error" ? (
            <div className="text-sm text-destructive">{t("userProfile.notFound")}</div>
          ) : (
            <>
              <h1 className="text-xl md:text-2xl font-semibold leading-tight">{displayName}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                @{profile?.username}
              </p>
              {profile?.bio && (
                <p className="mt-3 text-sm md:text-base text-foreground/90 whitespace-pre-wrap break-words">
                  {profile.bio}
                </p>
              )}
            </>
          )}
        </div>
      </section>

      <div className="space-y-4">
        {status === "pending" ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-4 border-b border-border/50">
              <Skeleton className="h-10 w-10 rounded-full shrink-0 mt-1" />
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-[130px]" />
                  <Skeleton className="h-3 w-[90px]" />
                </div>
                <Skeleton className="h-4 w-[92%]" />
                <Skeleton className="h-4 w-[78%]" />
              </div>
            </div>
          ))
        ) : status === "error" ? (
          <div className="text-center text-destructive p-4">{t("userProfile.loadError")}</div>
        ) : (
          <>
            {data.pages.map((page, i) => (
              <div key={i}>
                {page.data.map((memo) => (
                  <MemoCard key={memo.id} memo={memo} />
                ))}
              </div>
            ))}

            {hasNextPage && (
              <div ref={ref} className="flex justify-center pt-4">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
