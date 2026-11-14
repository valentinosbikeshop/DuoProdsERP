'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Organization, Profile } from '@/types';
import { SUPER_ADMIN_EMAIL } from '@/lib/constants';

export function useUser() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setAuthUser(user);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        const typedProfile = (profileData as Profile | null) ?? null;
        setProfile(typedProfile);

        if (typedProfile?.organization_id) {
          const { data: orgData } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', typedProfile.organization_id)
            .single();
          setOrganization((orgData as Organization | null) ?? null);
        } else {
          setOrganization(null);
        }
      } else {
        setAuthUser(null);
        setProfile(null);
        setOrganization(null);
      }
      setLoading(false);
    };

    fetchProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchProfile();
    });

    const handleOrgUpdated = () => {
      fetchProfile();
    };
    window.addEventListener('kairos:org-updated', handleOrgUpdated);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('kairos:org-updated', handleOrgUpdated);
    };
  }, [supabase]);

  const isSuperAdmin =
    Boolean(profile?.is_super_admin) ||
    (authUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());
  const isDemo = Boolean(organization?.is_demo);

  return {
    profile,
    organization,
    authUser,
    loading,
    isAdmin: profile?.role === 'admin' || isSuperAdmin,
    isSuperAdmin,
    isDemo,
  };
}
