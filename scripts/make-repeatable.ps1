$ErrorActionPreference = 'Stop'
$in = Join-Path $PSScriptRoot '..\supabase\sql-editor\full_setup.sql'
$out = Join-Path $PSScriptRoot '..\supabase\sql-editor\full_setup_repeatable.sql'
$text = [System.IO.File]::ReadAllText($in)
# PostgreSQL KHONG ho tro "CREATE POLICY IF NOT EXISTS".
# Cach chuan: chen DROP POLICY IF EXISTS ngay truoc moi CREATE POLICY.
# Xac dinh ten policy (chuoi trong ngoac kep) roi xoa truoc khi tao lai.
$text = [regex]::Replace(
  $text,
  '(?m)^(CREATE POLICY\s+)"([^"]+)"(\s+ON\s+)([A-Za-z0-9_\.]+)',
  {
    param($m)
    $drop = 'DROP POLICY IF EXISTS ' + $m.Groups[1].Value + ' ON ' + $m.Groups[3].Value + ';' + [System.Environment]::NewLine
    return $drop + $m.Value
  }
)
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
$dropCount = (Select-String -Path $out -Pattern '^DROP POLICY IF EXISTS').Count
$createCount = (Select-String -Path $out -Pattern '^CREATE POLICY ').Count
$badSyntax = (Select-String -Path $out -Pattern 'CREATE POLICY IF NOT EXISTS').Count
Write-Host "Lines: $lines"
Write-Host "DROP POLICY IF EXISTS: $dropCount"
Write-Host "CREATE POLICY (plain): $createCount"
Write-Host "CREATE POLICY IF NOT EXISTS (must be 0): $badSyntax"
