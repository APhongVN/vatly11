$ErrorActionPreference = 'Stop'
$in = Join-Path $PSScriptRoot '..\supabase\sql-editor\full_setup.sql'
$out = Join-Path $PSScriptRoot '..\supabase\sql-editor\full_setup_repeatable.sql'
$text = [System.IO.File]::ReadAllText($in)
$text = [regex]::Replace($text, '(?m)^CREATE POLICY (?!IF NOT EXISTS)', 'CREATE POLICY IF NOT EXISTS ')
$tail = @'

-- Chot: bao dam trigger tu tao ho so hoc sinh (an toan chay lai nhieu lan)
CREATE OR REPLACE FUNCTION public.create_student_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (NEW.id, 'student', COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_student_profile();
'@
$text = $text + $tail
[System.IO.File]::WriteAllText($out, $text, (New-Object System.Text.UTF8Encoding($false)))
$lines = (Get-Content $out).Count
$with = (Select-String -Path $out -Pattern 'CREATE POLICY IF NOT EXISTS').Count
$plain = (Select-String -Path $out -Pattern '^CREATE POLICY (?!IF NOT EXISTS)').Count
Write-Host "Lines: $lines"
Write-Host "IF NOT EXISTS policies: $with"
Write-Host "Plain CREATE POLICY remaining: $plain"
