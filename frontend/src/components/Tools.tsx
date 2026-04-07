import React, { useState } from 'react';
import { Card, Tabs, Input, Button, Slider, Checkbox, Select, Typography, message, Space } from 'antd';
import { DeleteOutlined, CopyOutlined, ReloadOutlined, EditOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Title, Text } = Typography;
const { TextArea } = Input;

// ============ JSON Parser ============
const JsonParser: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  const handleParse = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
    } catch (e: any) {
      message.error('JSON 格式错误: ' + e.message);
    }
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(input);
      setInput(JSON.stringify(parsed, null, 2));
      setOutput(JSON.stringify(parsed, null, 2));
    } catch (e: any) {
      message.error('JSON 格式错误: ' + e.message);
    }
  };

  const handleMinify = () => {
    try {
      const parsed = JSON.parse(input);
      setInput(JSON.stringify(parsed));
      setOutput(JSON.stringify(parsed));
    } catch (e: any) {
      message.error('JSON 格式错误: ' + e.message);
    }
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    message.success('已复制到剪贴板');
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleParse} type="primary">解析</Button>
        <Button onClick={handleFormat}>格式化</Button>
        <Button onClick={handleMinify}>压缩</Button>
        <Button onClick={handleClear} danger>清空</Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card size="small" title="输入" className="!bg-gray-900/80 !border-gray-700">
          <TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="粘贴 JSON 内容..."
            className="!bg-gray-800/50 !border-gray-600 !text-gray-200 font-mono"
            rows={15}
          />
        </Card>
        <Card size="small" title="输出" extra={<Button icon={<CopyOutlined />} size="small" onClick={handleCopy}>复制</Button>} className="!bg-gray-900/80 !border-gray-700">
          <TextArea
            value={output}
            readOnly
            className="!bg-gray-800/50 !border-gray-600 !text-gray-200 font-mono"
            rows={15}
          />
        </Card>
      </div>
    </div>
  );
};

// ============ Password Generator ============
const PasswordGenerator: React.FC = () => {
  const [length, setLength] = useState(16);
  const [count, setCount] = useState(1);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSpecial, setIncludeSpecial] = useState(false);
  const [passwords, setPasswords] = useState<string[]>([]);

  const charsets = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    special: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  };

  const generatePassword = () => {
    let charset = '';
    if (includeUppercase) charset += charsets.uppercase;
    if (includeLowercase) charset += charsets.lowercase;
    if (includeNumbers) charset += charsets.numbers;
    if (includeSpecial) charset += charsets.special;

    if (!charset) {
      message.error('请至少选择一种字符类型');
      return;
    }

    const newPasswords = [];
    for (let i = 0; i < count; i++) {
      let password = '';
      for (let j = 0; j < length; j++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
      }
      newPasswords.push(password);
    }
    setPasswords(newPasswords);
  };

  const handleCopy = (pwd: string) => {
    navigator.clipboard.writeText(pwd);
    message.success('已复制');
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(passwords.join('\n'));
    message.success('已全部复制');
  };

  return (
    <div className="space-y-6">
      <Card className="!bg-gray-900/80 !border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Text className="text-gray-300 block mb-2">密码长度: {length}</Text>
            <Slider
              min={4}
              max={64}
              value={length}
              onChange={setLength}
              className="!w-full"
            />
          </div>
          <div>
            <Text className="text-gray-300 block mb-2">生成数量: {count}</Text>
            <Slider
              min={1}
              max={20}
              value={count}
              onChange={setCount}
              className="!w-full"
            />
          </div>
        </div>

        <div className="mt-6">
          <Text className="text-gray-300 block mb-3">字符类型</Text>
          <Space wrap>
            <Checkbox checked={includeUppercase} onChange={(e) => setIncludeUppercase(e.target.checked)}>
              <span className="text-gray-300">大写字母 (A-Z)</span>
            </Checkbox>
            <Checkbox checked={includeLowercase} onChange={(e) => setIncludeLowercase(e.target.checked)}>
              <span className="text-gray-300">小写字母 (a-z)</span>
            </Checkbox>
            <Checkbox checked={includeNumbers} onChange={(e) => setIncludeNumbers(e.target.checked)}>
              <span className="text-gray-300">数字 (0-9)</span>
            </Checkbox>
            <Checkbox checked={includeSpecial} onChange={(e) => setIncludeSpecial(e.target.checked)}>
              <span className="text-gray-300">特殊字符 (!@#$%...)</span>
            </Checkbox>
          </Space>
        </div>

        <Button
          type="primary"
          icon={<ReloadOutlined />}
          size="large"
          className="!mt-6"
          onClick={generatePassword}
          block
        >
          生成密码
        </Button>
      </Card>

      {passwords.length > 0 && (
        <Card
          title="生成的密码"
          extra={
            <Space>
              <Button icon={<CopyOutlined />} size="small" onClick={handleCopyAll}>复制全部</Button>
              <Button icon={<ReloadOutlined />} size="small" onClick={generatePassword}>重新生成</Button>
            </Space>
          }
          className="!bg-gray-900/80 !border-gray-700"
        >
          <div className="space-y-2">
            {passwords.map((pwd, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input.Password
                  value={pwd}
                  readOnly
                  className="!bg-gray-800/50 !border-gray-600 font-mono"
                />
                <Button
                  icon={<CopyOutlined />}
                  size="small"
                  onClick={() => handleCopy(pwd)}
                />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

// ============ Main Tools Component ============
const Tools: React.FC = () => {
  const items = [
    { key: 'json', label: 'JSON 解析', children: <JsonParser /> },
    { key: 'password', label: '密码生成器', children: <PasswordGenerator /> },
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/">
            <Button
              type="text"
              icon={<ArrowLeftOutlined className="text-gray-400" />}
              className="!rounded-lg hover:!bg-indigo-500/20 group"
            >
              <span className="text-gray-400 group-hover:!text-white ml-1 transition-colors">返回</span>
            </Button>
          </Link>
          <div className="w-px h-6 bg-gray-700" />
          <span className="text-white text-2xl font-semibold">工具集合</span>
        </div>
        <Tabs
          items={items}
          className="custom-tabs"
        />
      </div>
    </div>
  );
};

export default Tools;
